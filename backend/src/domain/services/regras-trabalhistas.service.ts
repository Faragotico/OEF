import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  combineDateAndTime,
  formatDate,
  normalizeDate,
  parseEscalaLimit,
  shiftDurationHours,
  startOfIsoWeek,
} from '../../helpers/date.helpers';

// ============================================================
// RegrasTrabalhistasService — o "motor de regras" do OEF.
//
// Reimplementa em TypeScript as regras RN01 a RN07 descritas no
// documento do projeto (lá elas foram desenhadas como triggers do
// Postgres — fn_valida_funcionario_ativo, fn_valida_ausencia, etc.).
// Este projeto não usa triggers de banco: a mesma validação vive aqui,
// na camada de serviço, pra poder ser reaproveitada tanto na criação
// manual de uma alocação (AlocacaoService) quanto no motor de geração
// automática (GeracaoEscalaService) — os dois chamam validarAlocacao()
// com os mesmos critérios, então uma alocação manual nunca pode violar
// uma regra que a geração automática respeitaria, e vice-versa.
//
// Uma diferença deliberada em relação ao SQL do documento: lá, RN04
// (carga horária) e a RN06 (dias consecutivos) buscam o valor da regra
// through o id_regra ESPECÍFICO vinculado à escala — o que só funciona
// se esse id_regra apontar pro tipo certo ('carga_horaria_semanal' ou
// 'escala'). Como o dicionário de dados só reserva UM id_regra por
// escala (recomendado tipo 'escala', ex: 5x1), uma escala vinculada à
// regra 5x1 NUNCA bateria com tipo='carga_horaria_semanal' no SQL
// original, e o RN04 seria pulado silenciosamente. Aqui, cada regra é
// buscada pelo seu TIPO (global), não pelo id_regra da escala — assim
// RN04/RN05 valem sempre, não só quando o id_regra "certo" coincide.
//
// Exceção à regra "só o repository conhece o Prisma": este service
// cruza informação de várias tabelas só pra VALIDAR — não é dono de
// nenhuma entidade, então não faz sentido "pertencer" a um repository.
// ============================================================

export type ResultadoValidacaoAlocacao =
  | { valido: true }
  | { valido: false; regra: string; motivo: string };

export interface ContextoAlocacao {
  funcionarioId: number;
  data: Date;
  turnoId: number;
  escalaId: number;
  // Em updates, exclui a própria linha da checagem (senão uma alocação
  // sempre "colidiria consigo mesma").
  ignorarAlocacaoId?: number;
  // Usado só pelo GeracaoEscalaService, só para o dia de TRABALHO
  // programado de um titular pelo rodízio Nx M. RN04 soma horas dentro
  // da semana ISO (segunda a domingo) — como o ciclo do rodízio (ex: 6
  // dias no "5x1") não é múltiplo de 7, o dia de folga de cada titular
  // desliza um dia por semana, e em ~5 de cada 6 semanas isso faz o
  // titular acumular 6 dias de trabalho dentro de uma mesma semana ISO
  // (48h), mesmo respeitando o limite real do rodízio (nunca mais que 5
  // dias SEGUIDOS sem folga — isso é o RN06, que continua valendo).
  // Sem este flag, RN04 barra esse 6º dia isoladamente e força uma
  // folga NÃO programada, que cai na mesma data pra titulares
  // diferentes do posto (cada um tem deslocamento diferente, mas a
  // semana ISO é a mesma pra todos) — voltando a colocar duas pessoas
  // de folga junto no mesmo dia, que é justamente o que o rodízio foi
  // desenhado pra evitar. RN04 continua valendo integralmente pra
  // alocação manual (AlocacaoService) e para os coringas (que não têm
  // rodízio próprio e podem, sim, acumular horas demais cobrindo folga
  // atrás de folga).
  ignorarRN04?: boolean;
}

@Injectable()
export class RegrasTrabalhistasService {
  constructor(private readonly prisma: PrismaService) {}

  async validarAlocacao(
    ctx: ContextoAlocacao,
  ): Promise<ResultadoValidacaoAlocacao> {
    const data = normalizeDate(ctx.data);

    const funcionario = await this.prisma.funcionario.findUnique({
      where: { id: ctx.funcionarioId },
    });
    if (!funcionario) {
      return {
        valido: false,
        regra: 'FK',
        motivo: 'Funcionário informado não existe.',
      };
    }

    // RN01 — funcionário inativo não pode ser alocado
    if (!funcionario.status) {
      return {
        valido: false,
        regra: 'RN01',
        motivo: `Funcionário ${funcionario.nome} está inativo e não pode ser alocado.`,
      };
    }

    // RN02 — não pode alocar durante ausência registrada
    const ausencia = await this.prisma.ausencia.findFirst({
      where: {
        funcionarioId: ctx.funcionarioId,
        dataInic: { lte: data },
        dataFim: { gte: data },
      },
    });
    if (ausencia) {
      return {
        valido: false,
        regra: 'RN02',
        motivo: `Funcionário ${funcionario.nome} possui ausência registrada em ${formatDate(data)}.`,
      };
    }

    const escala = await this.prisma.escala.findUnique({
      where: { id: ctx.escalaId },
    });
    if (!escala) {
      return {
        valido: false,
        regra: 'FK',
        motivo: 'Escala informada não existe.',
      };
    }

    const turno = await this.prisma.turno.findUnique({
      where: { id: ctx.turnoId },
    });
    if (!turno) {
      return {
        valido: false,
        regra: 'FK',
        motivo: 'Turno informado não existe.',
      };
    }

    // RN03 — data da alocação deve estar dentro do período da escala
    if (data < escala.dataInic || data > escala.dataFim) {
      return {
        valido: false,
        regra: 'RN03',
        motivo: `Data ${formatDate(data)} está fora do período da escala (${formatDate(escala.dataInic)} a ${formatDate(escala.dataFim)}).`,
      };
    }

    // Conflito de horário (parte da validação da UC06): o funcionário já
    // tem alguma alocação nesse mesmo dia, em qualquer turno/posto.
    const conflito = await this.prisma.alocacao.findFirst({
      where: {
        funcionarioId: ctx.funcionarioId,
        data,
        ...(ctx.ignorarAlocacaoId
          ? { id: { not: ctx.ignorarAlocacaoId } }
          : {}),
      },
    });
    if (conflito) {
      return {
        valido: false,
        regra: 'conflito',
        motivo: `Funcionário ${funcionario.nome} já possui uma alocação em ${formatDate(data)}.`,
      };
    }

    // RN05 — intervalo interjornada mínimo (padrão CLT: 11h) entre o fim
    // do último turno do dia anterior e o início do turno novo.
    const diaAnterior = new Date(data);
    diaAnterior.setUTCDate(diaAnterior.getUTCDate() - 1);
    const alocacaoAnterior = await this.prisma.alocacao.findFirst({
      where: { funcionarioId: ctx.funcionarioId, data: diaAnterior },
      include: { turno: true },
      orderBy: { turno: { horaFim: 'desc' } },
    });
    if (alocacaoAnterior) {
      const fimAnterior = combineDateAndTime(
        diaAnterior,
        alocacaoAnterior.turno.horaFim,
      );
      const inicioNovo = combineDateAndTime(data, turno.horaInicio);
      const intervaloHoras =
        (inicioNovo.getTime() - fimAnterior.getTime()) / 3_600_000;
      const minInterjornada = await this.buscarValorRegra(
        'intervalo_interjornada',
        11,
      );
      if (intervaloHoras < minInterjornada) {
        return {
          valido: false,
          regra: 'RN05',
          motivo: `Intervalo interjornada do funcionário ${funcionario.nome} seria de ${intervaloHoras.toFixed(1)}h, inferior ao mínimo de ${minInterjornada}h.`,
        };
      }
    }

    // RN06 — escala 5x1 (ou o que a regra vinculada à escala definir):
    // máximo de N dias consecutivos trabalhados antes de uma folga.
    const regraEscala = await this.prisma.regra.findUnique({
      where: { id: escala.regraId },
    });
    const limiteConsecutivos = parseEscalaLimit(regraEscala?.valor) ?? 5;
    const consecutivosEscala = await this.contarDiasConsecutivos(
      ctx.funcionarioId,
      data,
      limiteConsecutivos,
    );
    if (consecutivosEscala >= limiteConsecutivos) {
      return {
        valido: false,
        regra: 'RN06',
        motivo: `Funcionário ${funcionario.nome} já possui ${consecutivosEscala} dias consecutivos trabalhados. A escala exige folga antes de nova alocação.`,
      };
    }

    // RN07 — Descanso Semanal Remunerado: nunca mais que 6 dias
    // consecutivos sem folga, independente da regra de escala usada
    // (é o piso legal, não o piso específico da regra 5x1).
    const consecutivosDsr = await this.contarDiasConsecutivos(
      ctx.funcionarioId,
      data,
      6,
    );
    if (consecutivosDsr >= 6) {
      return {
        valido: false,
        regra: 'RN07',
        motivo: `Funcionário ${funcionario.nome} atingiria 7 dias consecutivos sem folga, violando o Descanso Semanal Remunerado.`,
      };
    }

    // RN04 — carga horária semanal máxima (padrão: 44h), somando todas
    // as alocações do funcionário na semana ISO (segunda a domingo) da
    // data alocada. Pulado quando ignorarRN04=true (ver comentário no
    // ContextoAlocacao) — dia de trabalho programado pelo rodízio de um
    // titular, onde quem já garante o limite legal é o RN06.
    if (!ctx.ignorarRN04) {
      const maxHorasSemana = await this.buscarValorRegra(
        'carga_horaria_semanal',
        44,
      );
      const inicioSemana = startOfIsoWeek(data);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setUTCDate(fimSemana.getUTCDate() + 6);
      const alocacoesSemana = await this.prisma.alocacao.findMany({
        where: {
          funcionarioId: ctx.funcionarioId,
          data: { gte: inicioSemana, lte: fimSemana },
          ...(ctx.ignorarAlocacaoId
            ? { id: { not: ctx.ignorarAlocacaoId } }
            : {}),
        },
        include: { turno: true },
      });
      const horasAcumuladas = alocacoesSemana.reduce(
        (soma, a) => soma + shiftDurationHours(a.turno),
        0,
      );
      const horasComNova = horasAcumuladas + shiftDurationHours(turno);
      if (horasComNova > maxHorasSemana) {
        return {
          valido: false,
          regra: 'RN04',
          motivo: `Funcionário ${funcionario.nome} atingiria ${horasComNova.toFixed(1)}h na semana, superando o limite de ${maxHorasSemana}h.`,
        };
      }
    }

    return { valido: true };
  }

  // Versão que já lança a exceção HTTP certa — usada pela criação/edição
  // manual de alocação (AlocacaoService), que quer interromper a
  // requisição assim que uma regra falhar.
  async validarOuLancar(ctx: ContextoAlocacao): Promise<void> {
    const resultado = await this.validarAlocacao(ctx);
    if (resultado.valido) return;

    if (resultado.regra === 'FK') {
      throw new NotFoundException(resultado.motivo);
    }
    if (resultado.regra === 'conflito') {
      throw new ConflictException(resultado.motivo);
    }
    throw new BadRequestException(resultado.motivo);
  }

  // UC06 — Validar Escala: reexamina cada alocação já salva de uma
  // escala contra as mesmas regras. Útil depois de edições manuais
  // (remanejamento) feitas fora da geração automática.
  async validarEscalaExistente(escalaId: number) {
    const escala = await this.prisma.escala.findUnique({
      where: { id: escalaId },
      include: { alocacoes: { include: { funcionario: true } } },
    });
    if (!escala) {
      throw new NotFoundException(`Escala com id ${escalaId} não encontrada.`);
    }

    const violacoes: { alocacaoId: number; regra: string; motivo: string }[] =
      [];

    for (const alocacao of escala.alocacoes) {
      const resultado = await this.validarAlocacao({
        funcionarioId: alocacao.funcionarioId,
        data: alocacao.data,
        turnoId: alocacao.turnoId,
        escalaId: alocacao.escalaId,
        ignorarAlocacaoId: alocacao.id,
        // Mesmo critério do GeracaoEscalaService: titular (tem turno
        // padrão, não é coringa) trabalhando em SEU PRÓPRIO turno é dia
        // de rodízio normal, coberto pelo RN06 — não pelo RN04 (ver
        // comentário no ContextoAlocacao). Coringa, ou qualquer alocação
        // fora do turno padrão do funcionário (cobertura), continua sob
        // RN04 de verdade.
        ignorarRN04:
          !alocacao.funcionario.coringa &&
          alocacao.funcionario.turnoPadraoId === alocacao.turnoId,
      });
      if (!resultado.valido) {
        violacoes.push({
          alocacaoId: alocacao.id,
          regra: resultado.regra,
          motivo: resultado.motivo,
        });
      }
    }

    return {
      escalaId,
      totalAlocacoes: escala.alocacoes.length,
      valida: violacoes.length === 0,
      violacoes,
    };
  }

  private async buscarValorRegra(
    tipo: string,
    padrao: number,
  ): Promise<number> {
    const regra = await this.prisma.regra.findFirst({ where: { tipo } });
    const valor = regra ? Number(regra.valor) : NaN;
    return Number.isFinite(valor) ? valor : padrao;
  }

  // Espelha o loop das triggers fn_valida_escala_5x1 / fn_valida_dsr do
  // documento: anda pra trás, dia a dia, contando quantos dias
  // consecutivos o funcionário já trabalhou imediatamente antes de
  // `data`, até achar um dia sem alocação ou atingir o limite.
  private async contarDiasConsecutivos(
    funcionarioId: number,
    data: Date,
    limite: number,
  ): Promise<number> {
    let consecutivos = 0;
    const cursor = new Date(data);

    while (consecutivos < limite) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      const existe = await this.prisma.alocacao.findFirst({
        where: { funcionarioId, data: cursor },
      });
      if (!existe) break;
      consecutivos++;
    }

    return consecutivos;
  }
}
