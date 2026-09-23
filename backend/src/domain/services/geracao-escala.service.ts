import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { EscalaRepository } from '../repositories/escala.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { RegraRepository } from '../repositories/regra.repository';
import { RegrasTrabalhistasService } from './regras-trabalhistas.service';
import { GerarEscalaAutomaticaDto } from 'src/infra/http/dtos/escala/gerar-escala-automatica.dto';
import {
  type Pessoa,
  type ProblemaEscala,
  type Turno as TurnoDominio,
} from '../escala/modelo';
import { type DemandaTurno, inicioDoHistorico, montarDias, montarVagas } from '../escala/periodo';
import { planejar } from '../escala/planejador';
import {
  formatDate,
  formatTime,
  horaDecimal,
  normalizeDate,
  parseEscalaCiclo,
  shiftDurationHours,
} from 'src/helpers/date.helpers';

// ============================================================
// GeracaoEscalaService — UC05 "Gerar Escala Automaticamente".
//
// Este serviço faz três coisas, nesta ordem, e nada além disso:
//
//   1. CARREGA — uma batelada de consultas que traz tudo que a decisão
//      precisa: a grade de horários do posto, a equipe, as ausências do
//      período e os dias já trabalhados na semana anterior.
//   2. PLANEJA — chama `planejar()`, que é função pura. Nenhuma regra
//      de escala mora aqui.
//   3. GRAVA — uma transação com dois comandos: cria a escala e insere
//      as alocações de uma vez.
//
// A versão anterior misturava as três: ela decidia dia a dia, DENTRO de
// uma transação, chamando uma validação que batia no banco de dez a
// doze vezes por candidato. Uma geração de mês fazia perto de dois mil
// idas ao banco e precisava de 120 segundos de timeout pra não
// estourar. Agora são oito consultas antes e duas escritas depois, com
// a decisão inteira acontecendo em memória, fora da transação.
//
// Efeito colateral bom: SIMULAR ficou de graça. Gerar sem gravar é o
// mesmo caminho sem o passo 3 — então o gestor pode comparar 5x1 com
// 6x1 antes de escolher, em vez de gerar, não gostar, apagar a escala e
// tentar de novo.
// ============================================================
@Injectable()
export class GeracaoEscalaService {
  constructor(
    private readonly escalaRepository: EscalaRepository,
    private readonly postoTrabalhoRepository: PostoTrabalhoRepository,
    private readonly regraRepository: RegraRepository,
    private readonly regras: RegrasTrabalhistasService,
    private readonly prisma: PrismaService,
  ) {}

  async gerarAutomatica(dto: GerarEscalaAutomaticaDto) {
    const dataInicio = normalizeDate(dto.dataInicio);
    const dataFim = normalizeDate(dto.dataFim);
    const inicioIso = formatDate(dataInicio);
    const fimIso = formatDate(dataFim);

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

    // Só checa sobreposição quando vai realmente gravar: simular o
    // mesmo mês quantas vezes quiser é justamente o ponto da simulação.
    if (!dto.simular) {
      const sobreposta = await this.escalaRepository.findSobreposta(
        dto.postoId,
        dataInicio,
        dataFim,
      );
      if (sobreposta) {
        throw new ConflictException(
          `Já existe a escala #${sobreposta.id} para este posto no período ` +
            `${formatDate(sobreposta.dataInic)} a ${formatDate(sobreposta.dataFim)}. ` +
            'Apague ou ajuste essa escala antes de gerar outra para o mesmo intervalo.',
        );
      }
    }

    const regraEscala = dto.regraId
      ? await this.regraRepository.findById(dto.regraId)
      : await this.regraRepository.findPadraoOuPrimeiro('escala');
    if (!regraEscala) {
      throw new BadRequestException(
        dto.regraId
          ? `Regra com id ${dto.regraId} não encontrada.`
          : 'Nenhuma regra do tipo "escala" está cadastrada (ex: 5x1). ' +
            'Cadastre uma regra ou informe regraId explicitamente.',
      );
    }

    // ------------------------------------------------------------
    // 1. Carregar
    // ------------------------------------------------------------
    const [turnosDoPosto, candidatos, intrajornada, interjornada, cargaSemanal] =
      await Promise.all([
        this.prisma.turno.findMany({
          where: { postoId: dto.postoId },
          include: { demandas: true },
          orderBy: { horaInicio: 'asc' },
        }),
        this.prisma.funcionario.findMany({
          where: dto.funcionarioIds?.length
            ? { id: { in: dto.funcionarioIds } }
            : { status: true, postoId: dto.postoId },
          include: { habilitacoes: true, turnoPadrao: true },
          orderBy: { id: 'asc' },
        }),
        this.regras.buscarIntervaloIntrajornada(),
        this.regras.buscarIntervaloInterjornada(),
        this.regras.buscarCargaHorariaSemanal(),
      ]);

    if (turnosDoPosto.length === 0) {
      throw new BadRequestException(
        `O posto "${posto.nome}" não tem nenhum turno cadastrado. ` +
          'A escala é gerada a partir da grade de horários do posto: ' +
          'cadastre os turnos na tela Turnos antes de gerar.',
      );
    }
    // Id pedido que não existe no banco não pode passar despercebido.
    // O `where: { id: { in: [...] } }` simplesmente não traz a linha que
    // não existe, então sem esta checagem o gestor seleciona sete
    // pessoas, uma foi excluída nesse meio tempo, e a escala sai com
    // seis sem ninguém avisar — o tipo de silêncio que só aparece
    // quando a escala já está impressa no posto.
    if (dto.funcionarioIds?.length) {
      const encontrados = new Set(candidatos.map((f) => f.id));
      const inexistentes = dto.funcionarioIds.filter((id) => !encontrados.has(id));
      if (inexistentes.length > 0) {
        throw new NotFoundException(
          `Estes funcionários não existem: ${inexistentes.join(', ')}. ` +
            'Atualize a seleção antes de gerar a escala.',
        );
      }
    }

    if (candidatos.length === 0) {
      throw new BadRequestException(
        dto.funcionarioIds?.length
          ? 'Nenhum funcionário encontrado para gerar a escala.'
          : `Nenhum funcionário ativo está vinculado ao posto "${posto.nome}". ` +
            'Vincule os funcionários ao posto no cadastro, ou informe funcionarioIds explicitamente.',
      );
    }

    const deOutroPosto = candidatos.filter(
      (f) => f.postoId !== null && f.postoId !== dto.postoId,
    );
    if (deOutroPosto.length > 0) {
      throw new BadRequestException(
        `Estes funcionários estão vinculados a outro posto e não podem entrar na escala de "${posto.nome}": ` +
          `${deOutroPosto.map((f) => f.nome).join(', ')}.`,
      );
    }

    // Quem pode ser escalado: quem tem turno de casa, ou quem tem
    // habilitação. Sem nenhum dos dois o cadastro está incompleto e o
    // motor não tem como adivinhar onde a pessoa entra.
    const idsDosTurnos = new Set(turnosDoPosto.map((t) => t.id));
    const escalaveis = candidatos.filter(
      (f) =>
        (f.turnoPadraoId !== null && idsDosTurnos.has(f.turnoPadraoId)) ||
        f.habilitacoes.some((h) => idsDosTurnos.has(h.turnoId)),
    );
    const semTurno = candidatos
      .filter((f) => !escalaveis.includes(f))
      .map((f) => ({ id: f.id, nome: f.nome }));

    if (escalaveis.length === 0) {
      throw new BadRequestException(
        'Nenhum dos funcionários selecionados tem turno padrão nem habilitação ' +
          `em algum turno de "${posto.nome}". Complete o cadastro deles antes de gerar a escala.`,
      );
    }

    const idsEscalaveis = escalaveis.map((f) => f.id);
    const [ausencias, historico] = await Promise.all([
      this.prisma.ausencia.findMany({
        where: {
          funcionarioId: { in: idsEscalaveis },
          dataInic: { lte: dataFim },
          dataFim: { gte: dataInicio },
        },
      }),
      // Os dias já trabalhados na semana ANTERIOR ao período. Sem isso,
      // quem vinha trabalhando desde o fim do mês passado começa o mês
      // novo com o contador de dias seguidos zerado no plano — e o mês
      // emendado estoura o RN06 na primeira semana. Era um defeito
      // silencioso da versão anterior, que só olhava os dias do período.
      this.prisma.alocacao.findMany({
        where: {
          funcionarioId: { in: idsEscalaveis },
          data: {
            gte: normalizeDate(inicioDoHistorico(inicioIso)),
            lt: dataInicio,
          },
        },
        select: { funcionarioId: true, data: true, turnoId: true },
      }),
    ]);

    // ------------------------------------------------------------
    // 2. Planejar
    // ------------------------------------------------------------
    const { trabalho, descanso } = parseEscalaCiclo(regraEscala.valor);
    const dias = montarDias(inicioIso, fimIso);

    // Turnos que entram na conta: os do posto, mais qualquer turno de
    // histórico (pra interjornada e carga da semana da virada).
    const idsHistorico = new Set(historico.map((a) => a.turnoId));
    const turnosExtras = await this.prisma.turno.findMany({
      where: {
        id: { in: [...idsHistorico].filter((id) => !idsDosTurnos.has(id)) },
      },
    });

    const paraDominio = (t: {
      id: number;
      descricao: string | null;
      horaInicio: Date;
      horaFim: Date;
    }): TurnoDominio => ({
      id: t.id,
      nome: t.descricao ?? `${formatTime(t.horaInicio)}–${formatTime(t.horaFim)}`,
      inicio: horaDecimal(t.horaInicio),
      fim: horaDecimal(t.horaFim),
      // O intervalo intrajornada não é hora trabalhada: descontar aqui,
      // uma vez, é o que garante que a validação, o PDF e a grade
      // mostrem o mesmo número.
      duracaoEfetiva: Math.max(0, shiftDurationHours(t) - intrajornada),
    });

    const demandas: DemandaTurno[] = turnosDoPosto.map((t) => ({
      turnoId: t.id,
      porDiaDaSemana: Array.from({ length: 7 }, (_, diaSemana) => {
        const cadastrada = t.demandas.find((d) => d.diaSemana === diaSemana);
        // Turno sem demanda cadastrada pede uma pessoa por dia — que é
        // o comportamento que o sistema sempre teve.
        return cadastrada ? cadastrada.quantidade : 1;
      }),
    }));

    const ausenciasPorFuncionario = new Map<number, Set<string>>();
    for (const ausencia of ausencias) {
      const conjunto = ausenciasPorFuncionario.get(ausencia.funcionarioId) ?? new Set<string>();
      for (
        const cursor = normalizeDate(ausencia.dataInic);
        cursor <= ausencia.dataFim;
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      ) {
        conjunto.add(formatDate(cursor));
      }
      ausenciasPorFuncionario.set(ausencia.funcionarioId, conjunto);
    }

    const pessoas: Pessoa[] = escalaveis.map((f) => {
      const habilitados = new Set<number>(
        f.habilitacoes.map((h) => h.turnoId).filter((id) => idsDosTurnos.has(id)),
      );
      if (f.turnoPadraoId !== null && idsDosTurnos.has(f.turnoPadraoId)) {
        habilitados.add(f.turnoPadraoId);
      }
      return {
        id: f.id,
        nome: f.nome,
        turnosHabilitados: [...habilitados],
        turnoPreferido: f.turnoPadraoId,
        ausencias: ausenciasPorFuncionario.get(f.id) ?? new Set<string>(),
        nuncaNosDiasDaSemana: new Set(f.diasSemanaVetados),
      };
    });

    const problema: ProblemaEscala = {
      dias,
      vagas: montarVagas(dias, demandas),
      pessoas,
      turnos: [...turnosDoPosto, ...turnosExtras].map(paraDominio),
      limites: {
        cicloTrabalho: trabalho,
        cicloDescanso: descanso,
        // O menor entre o que a regra de escala pede (RN06) e as 6 do
        // descanso semanal remunerado (RN07).
        maxConsecutivos: Math.min(trabalho, 6),
        horasSemana: cargaSemanal,
        interjornada,
        permitirForaDoPreferido: dto.permitirForaDoPreferido ?? false,
      },
      historico: historico.map((a) => ({
        pessoaId: a.funcionarioId,
        diaIso: formatDate(a.data),
        turnoId: a.turnoId,
      })),
    };

    const plano = planejar(problema);

    // ------------------------------------------------------------
    // 3. Gravar (ou não, se for simulação)
    // ------------------------------------------------------------
    const gravado = dto.simular
      ? null
      : await this.prisma.$transaction(async (tx) => {
          const criada = await tx.escala.create({
            data: {
              dataInic: dataInicio,
              dataFim,
              postoId: dto.postoId,
              regraId: regraEscala.id,
            },
            include: { posto: true, regra: true },
          });
          await tx.alocacao.createMany({
            data: plano.atribuicoes.map((a) => ({
              data: normalizeDate(a.diaIso),
              funcionarioId: a.pessoaId,
              escalaId: criada.id,
              turnoId: a.turnoId,
            })),
          });
          // createMany não devolve as linhas criadas, e a tela precisa
          // dos ids pra permitir editar cada célula da grade logo
          // depois de gerar. Uma leitura a mais dentro da mesma
          // transação é mais barato do que inserir uma por uma.
          const alocacoes = await tx.alocacao.findMany({
            where: { escalaId: criada.id },
            orderBy: [{ data: 'asc' }, { turnoId: 'asc' }],
          });
          return { escala: criada, alocacoes };
        });
    const escala = gravado?.escala ?? null;

    // A resposta já vai com nomes e horários resolvidos: quem consome
    // não deveria precisar cruzar id com cadastro pra montar a tela.
    const turnoPorId = new Map(turnosDoPosto.map((t) => [t.id, t]));
    return {
      escala,
      simulacao: Boolean(dto.simular),
      periodo: { inicio: inicioIso, fim: fimIso },
      regra: {
        id: regraEscala.id,
        descricao: regraEscala.descricao,
        valor: regraEscala.valor,
        ciclo: { trabalho, descanso },
      },
      turnos: turnosDoPosto.map((t) => ({
        id: t.id,
        descricao: t.descricao,
        horaInicio: formatTime(t.horaInicio),
        horaFim: formatTime(t.horaFim),
        demandaPorDiaDaSemana: demandas.find((d) => d.turnoId === t.id)!.porDiaDaSemana,
      })),
      pessoas: escalaveis.map((f) => ({
        id: f.id,
        nome: f.nome,
        // Coringa não é mais coluna: é quem não tem horário de casa.
        coringa: f.turnoPadraoId === null,
        turnoPadraoId: f.turnoPadraoId,
      })),
      funcionariosSemTurno: semTurno,
      feriadosNoPeriodo: dias.filter((d) => d.ehFeriadoMaster).map((d) => d.iso),
      totalVagas: problema.vagas.length,
      totalAlocacoes: plano.atribuicoes.length,
      // Quando gravou, vão os ids reais (a grade precisa deles pra
      // editar célula por célula). Numa simulação não existe id: o
      // plano ainda não é uma escala.
      alocacoes: plano.atribuicoes.map((a) => {
        const turno = turnoPorId.get(a.turnoId);
        const gravada = gravado?.alocacoes.find(
          (g) =>
            g.funcionarioId === a.pessoaId &&
            g.turnoId === a.turnoId &&
            formatDate(g.data) === a.diaIso,
        );
        return {
          id: gravada?.id ?? null,
          data: a.diaIso,
          funcionarioId: a.pessoaId,
          turnoId: a.turnoId,
          foraDoPreferido: a.foraDoPreferido,
          turno: turno
            ? {
                horaInicio: formatTime(turno.horaInicio),
                horaFim: formatTime(turno.horaFim),
              }
            : null,
        };
      }),
      folgas: plano.folgas,
      vagasVazias: plano.vagasVazias,
      // Códigos, não frases: o texto de cada diagnóstico mora no
      // frontend, num lugar só. A versão anterior devolvia cinco campos
      // `avisoX: string | null` com o parágrafo já montado, o que
      // espalhava a mesma informação em formatos diferentes e deixava a
      // tela sem saber a gravidade de nada.
      diagnosticos: plano.diagnosticos,
      reparosAplicados: plano.reparosAplicados,
    };
  }
}
