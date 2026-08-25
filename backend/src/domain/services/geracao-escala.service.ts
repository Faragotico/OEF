import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Alocacao } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { EscalaRepository } from '../repositories/escala.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { RegraRepository } from '../repositories/regra.repository';
import { AlocacaoRepository } from '../repositories/alocacao.repository';
import { RegrasTrabalhistasService } from './regras-trabalhistas.service';
import { GerarEscalaAutomaticaDto } from 'src/infra/http/dtos/escala/gerar-escala-automatica.dto';
import {
  formatDate,
  normalizeDate,
  parseEscalaCiclo,
} from 'src/helpers/date.helpers';

// ============================================================
// GeracaoEscalaService — UC05 "Gerar Escala Automaticamente".
//
// Algoritmo: TURNO FIXO POR FUNCIONÁRIO + RODÍZIO DE FOLGA. As escalas
// reais da Sharon Pontes (ver os PDFs ESCALA_MATRIZ_*_2026 e
// UVARANAS_ESCALAS_MARÇO_2025 que o cliente mandou) não rodiziam turno
// entre pessoas — cada funcionário tem UM horário pessoal fixo o mês
// inteiro (turnoPadraoId) e o que varia dia a dia é só se ele trabalha
// ou folga. Trocas de turno num dia específico existem (substituição,
// folga coberta por outro), mas isso é uma ALTERAÇÃO pontual feita
// depois (editando a Alocacao daquele dia), não faz parte da geração.
//
// Reparando nas escalas reais, as folgas TAMBÉM não são soltas: dentro
// do mesmo posto, no geral só UMA pessoa folga por dia — nunca duas do
// mesmo posto folgando junto (senão o posto ficaria descoberto). Pra
// reproduzir isso, cada funcionário começa o ciclo Nx M (ex: 5x1) num
// "deslocamento" diferente, igual à posição dele na lista (0, 1, 2...).
// Com N funcionários ≤ tamanho do ciclo (N+M), os deslocamentos nunca
// colidem — cada um folga num dia diferente do ciclo, pra sempre.
// Se o posto tiver mais TITULARES (funcionários com turno fixo) do que
// o tamanho do ciclo, a partir do (N+M+1)-ésimo os deslocamentos
// começam a se repetir e duas pessoas podem acabar folgando no mesmo
// dia — é uma limitação honesta do rodízio simples, não um bug (esse
// posto precisaria de um segundo ciclo, ou de mais um coringa).
//
// CORINGA (funcionario.coringa = true): visto na escala real
// UVARANAS_ESCALAS_MARÇO_2025 — um funcionário sem turno fixo, que
// cobre o turno de quem estiver de folga no dia (por isso o horário
// dele muda todo dia). Se nenhum titular estiver de folga num dia, o
// coringa também folga. O motor decide os titulares do dia primeiro,
// e só depois atribui os coringas às folgas que sobraram — se não
// houver coringa suficiente (ou nenhum passar nas regras daquele
// turno), a folga fica descoberta e aparece em coberturasPendentes.
//
// O motor, pra cada titular, percorre dia a dia do período: primeiro
// confere se hoje é o dia de folga PROGRAMADA dele no rodízio — se
// for, já marca folga sem nem tentar alocar. Se não for (dia de
// trabalho programado), tenta alocar no turno padrão dele usando as
// mesmas regras de uma alocação manual (RN01-RN07 + conflito de
// horário, via RegrasTrabalhistasService); se algo mais impedir
// (ausência registrada, interjornada, etc.), o dia também vira folga,
// com o motivo real registrado no resumo.
//
// Funcionário sem turnoPadraoId e sem ser coringa não entra na geração
// — o motor não tem como adivinhar em qual horário colocá-lo. Esses
// casos voltam separados na resposta (funcionariosSemTurnoPadrao) pra
// o gestor saber que precisa completar o cadastro antes.
// ============================================================
@Injectable()
export class GeracaoEscalaService {
  constructor(
    private readonly escalaRepository: EscalaRepository,
    private readonly postoTrabalhoRepository: PostoTrabalhoRepository,
    private readonly regraRepository: RegraRepository,
    private readonly alocacaoRepository: AlocacaoRepository,
    private readonly regras: RegrasTrabalhistasService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarAutomatica(dto: GerarEscalaAutomaticaDto) {
    const dataInicio = normalizeDate(dto.dataInicio);
    const dataFim = normalizeDate(dto.dataFim);

    if (dataFim < dataInicio) {
      throw new BadRequestException(
        'dataFim deve ser igual ou posterior a dataInicio.',
      );
    }

    const posto = await this.postoTrabalhoRepository.findById(dto.postoId);
    if (!posto) {
      throw new NotFoundException(
        `Posto de trabalho com id ${dto.postoId} não encontrado.`,
      );
    }

    const regraEscala = dto.regraId
      ? await this.regraRepository.findById(dto.regraId)
      : (await this.regraRepository.findAll()).find((r) => r.tipo === 'escala');
    if (!regraEscala) {
      throw new BadRequestException(
        dto.regraId
          ? `Regra com id ${dto.regraId} não encontrada.`
          : 'Nenhuma regra do tipo "escala" está cadastrada (ex: 5x1). Cadastre uma regra ou informe regraId explicitamente.',
      );
    }

    // Candidatos: os funcionários informados, ou (se não vier
    // funcionarioIds) todos os ativos. Separados em dois grupos:
    // TITULARES (têm turnoPadraoId — entram no rodízio de turno fixo) e
    // CORINGAS (coringa=true — não têm turno próprio, cobrem quem
    // estiver de folga no dia). Quem não é coringa e não tem turno
    // padrão fica de fora, listado em funcionariosSemTurnoPadrao.
    const candidatos = dto.funcionarioIds?.length
      ? await this.prisma.funcionario.findMany({
          where: { id: { in: dto.funcionarioIds } },
          orderBy: { id: 'asc' },
        })
      : await this.prisma.funcionario.findMany({
          where: { status: true },
          orderBy: { id: 'asc' },
        });

    if (candidatos.length === 0) {
      throw new BadRequestException(
        'Nenhum funcionário encontrado para gerar a escala.',
      );
    }

    const funcionariosSemTurnoPadrao = candidatos
      .filter((f) => !f.coringa && !f.turnoPadraoId)
      .map((f) => ({ id: f.id, nome: f.nome }));

    const titulares = candidatos.filter(
      (f): f is typeof f & { turnoPadraoId: number } =>
        !f.coringa && !!f.turnoPadraoId,
    );

    const coringas = candidatos.filter((f) => f.coringa);

    if (titulares.length === 0) {
      throw new BadRequestException(
        'Nenhum dos funcionários elegíveis tem um turno padrão definido (e nenhum é coringa). ' +
          'Defina o turno padrão no cadastro do funcionário, ou marque-o como coringa, antes de gerar a escala.',
      );
    }

    const escala = await this.escalaRepository.create({
      dataInic: dataInicio,
      dataFim,
      postoId: dto.postoId,
      regraId: regraEscala.id,
    });

    const alocacoesCriadas: Alocacao[] = [];

    type Resumo = {
      funcionarioId: number;
      nome: string;
      turnoPadraoId: number | null;
      coringa: boolean;
      diasTrabalhados: string[];
      folgas: { data: string; motivo: string }[];
      // Só preenchido pra coringa: qual turno (de qual titular) ele
      // cobriu em cada dia trabalhado — o turno dele muda todo dia.
      coberturas: {
        data: string;
        turnoId: number;
        funcionarioCobertoId: number;
        funcionarioCobertoNome: string;
      }[];
    };
    const resumoPorFuncionario = new Map<number, Resumo>();
    for (const titular of titulares) {
      resumoPorFuncionario.set(titular.id, {
        funcionarioId: titular.id,
        nome: titular.nome,
        turnoPadraoId: titular.turnoPadraoId,
        coringa: false,
        diasTrabalhados: [],
        folgas: [],
        coberturas: [],
      });
    }
    for (const coringaFuncionario of coringas) {
      resumoPorFuncionario.set(coringaFuncionario.id, {
        funcionarioId: coringaFuncionario.id,
        nome: coringaFuncionario.nome,
        turnoPadraoId: null,
        coringa: true,
        diasTrabalhados: [],
        folgas: [],
        coberturas: [],
      });
    }

    // Ciclo de trabalho/descanso da regra (ex: "5x1" -> trabalha 5,
    // descansa 1 -> ciclo de 6 dias). Cada titular começa esse ciclo
    // num deslocamento diferente (a posição dele nesta lista), pra
    // escalonar as folgas entre os titulares do posto.
    const { trabalho, descanso } = parseEscalaCiclo(regraEscala.valor);
    const cicloLength = trabalho + descanso;

    const coberturasPendentes: {
      data: string;
      funcionario: string;
      motivo: string;
    }[] = [];

    // Loop DIA a dia (não mais funcionário a funcionário): pra cada
    // dia, primeiro decide quem dos titulares trabalha ou folga; só
    // DEPOIS disso os coringas entram, um a um, cobrindo as folgas do
    // dia — porque o turno do coringa é sempre o de quem ele cobre,
    // então só dá pra saber depois de decidir os titulares do dia.
    //
    // diaIndice é a data em número absoluto de dias (desde a época
    // Unix), NÃO um contador relativo ao início desta escala. Foi
    // relativo antes, e isso quebrava quando dava pra gerar o mês
    // seguinte pro mesmo posto: o rodízio "reiniciava" do zero em cada
    // escala nova, mas o RN06/RN07 (dias consecutivos) olham TODAS as
    // alocações do funcionário no banco, sem se importar com qual
    // escala — contam de verdade, cruzando o fim do mês anterior. O
    // rodízio "reiniciado" achava que ainda faltavam dias de trabalho
    // pro titular quando na prática ele já vinha de uma sequência do
    // mês anterior, e o RN06/RN07 forçava uma folga um dia ANTES da
    // programada — e como isso valia pra cada titular ao mesmo tempo
    // (index diferente, mas todos "reiniciando" junto), duas pessoas
    // acabavam de folga no mesmo dia de novo, só que agora só nos
    // primeiros dias da escala nova. Com diaIndice absoluto, o rodízio
    // continua de onde parou no mês anterior — sem descontinuidade — e
    // fica sempre de acordo com o que o RN06/RN07 já enxergam.
    for (
      let dataAtual = new Date(dataInicio);
      dataAtual <= dataFim;
      dataAtual.setUTCDate(dataAtual.getUTCDate() + 1)
    ) {
      const diaIndice = Math.floor(dataAtual.getTime() / 86_400_000);
      const aCobrirHoje: {
        funcionarioId: number;
        nome: string;
        turnoId: number;
      }[] = [];

      for (let indice = 0; indice < titulares.length; indice++) {
        const titular = titulares[indice];
        const resumo = resumoPorFuncionario.get(titular.id)!;
        const deslocamento = indice % cicloLength;
        const posicaoNoCiclo = (diaIndice + deslocamento) % cicloLength;
        const folgaProgramada = posicaoNoCiclo >= trabalho;

        if (folgaProgramada) {
          resumo.folgas.push({
            data: formatDate(dataAtual),
            motivo: `Folga programada pelo rodízio ${trabalho}x${descanso} (evita coincidir com a folga de outro funcionário do posto).`,
          });
          aCobrirHoje.push({
            funcionarioId: titular.id,
            nome: titular.nome,
            turnoId: titular.turnoPadraoId,
          });
          continue;
        }

        const resultado = await this.regras.validarAlocacao({
          funcionarioId: titular.id,
          data: new Date(dataAtual),
          turnoId: titular.turnoPadraoId,
          escalaId: escala.id,
          // Dia de TRABALHO programado pelo rodízio: quem garante o
          // limite legal aqui é o RN06 (máx. dias seguidos), não o RN04
          // (44h por semana ISO) — o ciclo do rodízio não é múltiplo de
          // 7, então o RN04 bloquearia um dia de trabalho normal do
          // rodízio quase toda semana (ver comentário no
          // ContextoAlocacao), gerando folga extra não programada e
          // derrubando a garantia de "só uma folga por dia no posto".
          ignorarRN04: true,
        });

        if (resultado.valido) {
          const alocacao = await this.alocacaoRepository.create({
            data: new Date(dataAtual),
            funcionarioId: titular.id,
            escalaId: escala.id,
            turnoId: titular.turnoPadraoId,
          });
          alocacoesCriadas.push(alocacao);
          resumo.diasTrabalhados.push(formatDate(dataAtual));
        } else {
          resumo.folgas.push({
            data: formatDate(dataAtual),
            motivo: resultado.motivo,
          });
          aCobrirHoje.push({
            funcionarioId: titular.id,
            nome: titular.nome,
            turnoId: titular.turnoPadraoId,
          });
        }
      }

      // Coringas cobrem, um a um, as folgas de hoje que ainda faltam
      // cobrir. Se um coringa não passar nas regras (ex: interjornada
      // com o turno que ele trabalhou ontem), a cobertura continua
      // pendente pro PRÓXIMO coringa tentar o mesmo alvo.
      let proximaCobertura = 0;
      for (const coringaFuncionario of coringas) {
        const resumoCoringa = resumoPorFuncionario.get(coringaFuncionario.id)!;
        const alvo = aCobrirHoje[proximaCobertura];

        if (!alvo) {
          resumoCoringa.folgas.push({
            data: formatDate(dataAtual),
            motivo:
              'Sem cobertura necessária hoje — nenhum titular estava de folga.',
          });
          continue;
        }

        const resultado = await this.regras.validarAlocacao({
          funcionarioId: coringaFuncionario.id,
          data: new Date(dataAtual),
          turnoId: alvo.turnoId,
          escalaId: escala.id,
        });

        if (resultado.valido) {
          const alocacao = await this.alocacaoRepository.create({
            data: new Date(dataAtual),
            funcionarioId: coringaFuncionario.id,
            escalaId: escala.id,
            turnoId: alvo.turnoId,
          });
          alocacoesCriadas.push(alocacao);
          resumoCoringa.diasTrabalhados.push(formatDate(dataAtual));
          resumoCoringa.coberturas.push({
            data: formatDate(dataAtual),
            turnoId: alvo.turnoId,
            funcionarioCobertoId: alvo.funcionarioId,
            funcionarioCobertoNome: alvo.nome,
          });
          proximaCobertura++;
        } else {
          resumoCoringa.folgas.push({
            data: formatDate(dataAtual),
            motivo: resultado.motivo,
          });
        }
      }

      for (const descoberta of aCobrirHoje.slice(proximaCobertura)) {
        coberturasPendentes.push({
          data: formatDate(dataAtual),
          funcionario: descoberta.nome,
          motivo:
            coringas.length === 0
              ? 'Nenhum coringa incluído nesta geração.'
              : 'Nenhum coringa disponível conseguiu cobrir esta folga.',
        });
      }
    }

    // Aviso honesto: com mais titulares do que dias no ciclo, o
    // rodízio começa a repetir deslocamento e duas pessoas podem
    // acabar com folga no mesmo dia (mesmo com coringa, só um deles
    // seria coberto).
    const avisoRodizio =
      titulares.length > cicloLength
        ? `Este posto tem ${titulares.length} funcionário(s) com turno fixo para um ciclo de ${cicloLength} dias (${trabalho}x${descanso}). ` +
          'A partir do funcionário de número ' +
          `${cicloLength + 1}, o rodízio repete deslocamento e pode haver mais de uma folga no mesmo dia.`
        : null;

    return {
      escala,
      alocacoesCriadas,
      totalAlocacoesCriadas: alocacoesCriadas.length,
      resumoPorFuncionario: Array.from(resumoPorFuncionario.values()),
      funcionariosSemTurnoPadrao,
      avisoRodizio,
      coberturasPendentes,
    };
  }
}
