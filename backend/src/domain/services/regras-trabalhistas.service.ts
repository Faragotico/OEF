import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  type CodigoRegra,
  type Dia,
  type Pessoa,
  type Turno as TurnoDominio,
  desloca,
  diaDaSemanaDe,
  semanaIsoDe,
} from '../escala/modelo';
import { criarEstado, verificar } from '../escala/restricoes';
import { auditar } from '../escala/auditoria';
import { montarDias } from '../escala/periodo';
import { DIAS_DE_HISTORICO } from '../escala/periodo';
import {
  formatDate,
  formatTime,
  horaDecimal,
  normalizeDate,
  parseEscalaCiclo,
  shiftDurationHours,
} from '../../helpers/date.helpers';

// ============================================================
// RegrasTrabalhistasService — a ponte entre o banco e as regras.
//
// As regras RN02 e RN04 a RN07 NÃO moram mais aqui: elas são funções
// puras em `domain/escala/restricoes.ts`, e este serviço só carrega o
// estado do banco e chama aquelas funções. É a mudança que garante que
// a geração automática e a validação manual julguem pelo mesmo critério
// — antes eram duas implementações que podiam divergir, e divergiam.
//
// Sobrou aqui o que é estrutural e realmente precisa do banco:
//
//   RN01  funcionário inativo        -> lê funcionario.status
//   RN03  data fora do período       -> compara com a escala
//   FK    entidade inexistente       -> a linha não existe
//   conflito de horário no dia       -> outra alocação no mesmo dia
//
// Uma diferença deliberada em relação ao SQL do documento: lá, RN04 e
// RN06 buscam o valor da regra pelo id_regra da escala, o que só
// funciona se esse id apontar pro tipo certo. Como o dicionário de
// dados reserva UM id_regra por escala (tipo 'escala', ex: 5x1), o RN04
// nunca casaria com 'carga_horaria_semanal' e seria pulado em silêncio.
// Aqui cada regra é buscada pelo TIPO, então todas valem sempre.
// ============================================================

export type ResultadoValidacaoAlocacao =
  | { valido: true }
  | { valido: false; regra: string; motivo: string };

export type ClientePrisma = PrismaService | Prisma.TransactionClient;

export interface ContextoAlocacao {
  funcionarioId: number;
  data: Date;
  turnoId: number;
  escalaId: number;
  /** Em updates, exclui a própria linha da checagem. */
  ignorarAlocacaoId?: number;
  cliente?: ClientePrisma;
}

// Frases das regras puras, num lugar só. O domínio devolve código; a
// tradução para português acontece na borda.
const MOTIVO: Record<CodigoRegra, (nome: string, extra: string) => string> = {
  RN01: (nome) => `Funcionário ${nome} está inativo e não pode ser alocado.`,
  RN02: (nome, dia) => `Funcionário ${nome} possui ausência registrada em ${dia}.`,
  RN04: (nome, limite) =>
    `Funcionário ${nome} passaria do limite de ${limite}h efetivamente trabalhadas na semana ` +
    '(o intervalo intrajornada de cada turno já está descontado).',
  RN05: (nome, minimo) =>
    `Funcionário ${nome} não teria o intervalo mínimo de ${minimo}h entre o fim de um turno e o início do outro.`,
  RN06: (nome, limite) =>
    `Funcionário ${nome} passaria de ${limite} dias consecutivos trabalhados. A escala exige folga antes de nova alocação.`,
  RN07: (nome) =>
    `Funcionário ${nome} atingiria 7 dias consecutivos sem folga, violando o Descanso Semanal Remunerado.`,
  conflito: (nome, dia) => `Funcionário ${nome} já possui uma alocação em ${dia}.`,
  'nao-habilitado': (nome) => `Funcionário ${nome} não está habilitado neste turno.`,
  'dia-da-semana-vetado': (nome) =>
    `O cadastro de ${nome} não permite trabalho neste dia da semana.`,
};

@Injectable()
export class RegrasTrabalhistasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida UMA alocação. Usada na criação e edição manual (UC06) e em
   * qualquer lugar que precise perguntar "isso pode?".
   *
   * Carrega, numa consulta só, a janela de dias que as regras enxergam
   * (a semana ISO da data mais os sete dias de cada lado), monta o
   * estado em memória e roda as mesmas funções puras que o planejador
   * usa. Antes eram de dez a doze consultas por chamada.
   */
  async validarAlocacao(
    ctx: ContextoAlocacao,
  ): Promise<ResultadoValidacaoAlocacao> {
    const data = normalizeDate(ctx.data);
    const diaIso = formatDate(data);
    const db = ctx.cliente ?? this.prisma;

    const [funcionario, escala, turno] = await Promise.all([
      db.funcionario.findUnique({ where: { id: ctx.funcionarioId } }),
      db.escala.findUnique({ where: { id: ctx.escalaId } }),
      db.turno.findUnique({ where: { id: ctx.turnoId } }),
    ]);

    if (!funcionario) {
      return { valido: false, regra: 'FK', motivo: 'Funcionário informado não existe.' };
    }
    if (!escala) {
      return { valido: false, regra: 'FK', motivo: 'Escala informada não existe.' };
    }
    if (!turno) {
      return { valido: false, regra: 'FK', motivo: 'Turno informado não existe.' };
    }

    // RN01 — inativo não é alocável. Estrutural: não é uma restrição do
    // problema de escala, é o cadastro dizendo que a pessoa não existe
    // para efeito de alocação.
    if (!funcionario.status) {
      return { valido: false, regra: 'RN01', motivo: MOTIVO.RN01(funcionario.nome, '') };
    }

    // RN03 — a data tem que caber no período da escala.
    if (data < escala.dataInic || data > escala.dataFim) {
      return {
        valido: false,
        regra: 'RN03',
        motivo:
          `Data ${diaIso} está fora do período da escala ` +
          `(${formatDate(escala.dataInic)} a ${formatDate(escala.dataFim)}).`,
      };
    }

    const [intrajornada, interjornada, cargaSemanal, regraEscala] = await Promise.all([
      this.buscarIntervaloIntrajornada(db),
      this.buscarIntervaloInterjornada(db),
      this.buscarCargaHorariaSemanal(db),
      db.regra.findUnique({ where: { id: escala.regraId } }),
    ]);
    const { trabalho } = parseEscalaCiclo(regraEscala?.valor);

    // A janela que as regras enxergam: uma semana pra cada lado cobre a
    // semana ISO inteira (RN04) e as sequências de dias seguidos (RN06,
    // RN07), inclusive quando a data está na ponta da semana.
    const inicioJanela = normalizeDate(desloca(diaIso, -DIAS_DE_HISTORICO - 7));
    const fimJanela = normalizeDate(desloca(diaIso, DIAS_DE_HISTORICO + 7));
    const [vizinhas, ausencia] = await Promise.all([
      db.alocacao.findMany({
        where: {
          funcionarioId: ctx.funcionarioId,
          data: { gte: inicioJanela, lte: fimJanela },
          ...(ctx.ignorarAlocacaoId ? { id: { not: ctx.ignorarAlocacaoId } } : {}),
        },
        include: { turno: true },
      }),
      db.ausencia.findFirst({
        where: {
          funcionarioId: ctx.funcionarioId,
          dataInic: { lte: data },
          dataFim: { gte: data },
        },
      }),
    ]);

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
      duracaoEfetiva: Math.max(0, shiftDurationHours(t) - intrajornada),
    });

    const turnos = new Map<number, TurnoDominio>([[turno.id, paraDominio(turno)]]);
    for (const a of vizinhas) {
      if (!turnos.has(a.turnoId)) turnos.set(a.turnoId, paraDominio(a.turno));
    }

    // A pessoa entra sem restrição de qualificação de propósito: pôr
    // alguém fora do horário de casa é decisão legítima do gestor numa
    // edição manual, não irregularidade trabalhista.
    const pessoa: Pessoa = {
      id: funcionario.id,
      nome: funcionario.nome,
      turnosHabilitados: [turno.id],
      turnoPreferido: null,
      ausencias: ausencia ? new Set([diaIso]) : new Set<string>(),
      nuncaNosDiasDaSemana: new Set<number>(),
    };

    const dia: Dia = {
      iso: diaIso,
      diaDaSemana: diaDaSemanaDe(diaIso),
      ehFeriadoMaster: false, // feriado não impede alocação manual
      semanaIso: semanaIsoDe(diaIso),
    };

    const estado = criarEstado(
      [pessoa],
      vizinhas.map((a) => ({
        pessoaId: a.funcionarioId,
        diaIso: formatDate(a.data),
        turnoId: a.turnoId,
      })),
      turnos,
      semanaIsoDe,
    );

    const veredito = verificar(
      estado,
      { pessoa, dia, turno: turnos.get(turno.id)! },
      {
        cicloTrabalho: trabalho,
        cicloDescanso: 1,
        maxConsecutivos: Math.min(trabalho, 6),
        horasSemana: cargaSemanal,
        interjornada,
        permitirForaDoPreferido: true,
      },
      turnos,
    );

    if (veredito.ok) return { valido: true };

    const extra: Record<string, string> = {
      RN04: String(cargaSemanal),
      RN05: String(interjornada),
      RN06: String(Math.min(trabalho, 6)),
    };
    return {
      valido: false,
      regra: veredito.regra,
      motivo: MOTIVO[veredito.regra](funcionario.nome, extra[veredito.regra] ?? diaIso),
    };
  }

  /**
   * Versão que lança a exceção HTTP certa — usada pela criação e edição
   * manual de alocação.
   *
   * SÓ bloqueia violação estrutural (FK, RN03, conflito de horário).
   * RN04 a RN07 são regras trabalhistas: a geração automática respeita
   * todas à risca, mas bloqueá-las de novo numa edição manual impede
   * uma correção legítima — cobrir à mão uma vaga que ficou vazia
   * porque estourava 44h na semana é decisão do gestor, não do sistema.
   * Quem quiser conferir depois usa "Validar Escala".
   */
  async validarOuLancar(ctx: ContextoAlocacao): Promise<void> {
    const resultado = await this.validarAlocacao(ctx);
    if (resultado.valido) return;
    if (resultado.regra === 'FK') throw new NotFoundException(resultado.motivo);
    if (resultado.regra === 'conflito') throw new ConflictException(resultado.motivo);
    if (resultado.regra === 'RN03') throw new BadRequestException(resultado.motivo);
  }

  /**
   * UC06 — Validar Escala. Reexamina TODAS as alocações já salvas.
   *
   * Delega ao `auditar` do domínio, que monta o estado do zero e julga
   * cada alocação com ela mesma removida. Antes este método chamava
   * `validarAlocacao` numa por uma — uma escala de mês com 150
   * alocações fazia mais de mil consultas. Agora são cinco.
   */
  async validarEscalaExistente(escalaId: number) {
    const escala = await this.prisma.escala.findUnique({
      where: { id: escalaId },
      include: {
        regra: true,
        alocacoes: { include: { funcionario: true, turno: true } },
      },
    });
    if (!escala) {
      throw new NotFoundException(`Escala com id ${escalaId} não encontrada.`);
    }

    const inicioIso = formatDate(escala.dataInic);
    const fimIso = formatDate(escala.dataFim);
    const funcionarioIds = [...new Set(escala.alocacoes.map((a) => a.funcionarioId))];

    const [intrajornada, interjornada, cargaSemanal, ausencias, historico] =
      await Promise.all([
        this.buscarIntervaloIntrajornada(),
        this.buscarIntervaloInterjornada(),
        this.buscarCargaHorariaSemanal(),
        this.prisma.ausencia.findMany({
          where: {
            funcionarioId: { in: funcionarioIds },
            dataInic: { lte: escala.dataFim },
            dataFim: { gte: escala.dataInic },
          },
        }),
        this.prisma.alocacao.findMany({
          where: {
            funcionarioId: { in: funcionarioIds },
            data: {
              gte: normalizeDate(desloca(inicioIso, -DIAS_DE_HISTORICO)),
              lt: escala.dataInic,
            },
          },
          include: { turno: true },
        }),
      ]);

    const { trabalho } = parseEscalaCiclo(escala.regra?.valor);

    const turnosPorId = new Map<number, TurnoDominio>();
    for (const t of [
      ...escala.alocacoes.map((a) => a.turno),
      ...historico.map((a) => a.turno),
    ]) {
      if (turnosPorId.has(t.id)) continue;
      turnosPorId.set(t.id, {
        id: t.id,
        nome: t.descricao ?? `${formatTime(t.horaInicio)}–${formatTime(t.horaFim)}`,
        inicio: horaDecimal(t.horaInicio),
        fim: horaDecimal(t.horaFim),
        duracaoEfetiva: Math.max(0, shiftDurationHours(t) - intrajornada),
      });
    }

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

    const nomePorId = new Map(
      escala.alocacoes.map((a) => [a.funcionarioId, a.funcionario.nome]),
    );
    const pessoas: Pessoa[] = funcionarioIds.map((id) => ({
      id,
      nome: nomePorId.get(id) ?? `#${id}`,
      turnosHabilitados: [...turnosPorId.keys()],
      turnoPreferido: null,
      ausencias: ausenciasPorFuncionario.get(id) ?? new Set<string>(),
      nuncaNosDiasDaSemana: new Set<number>(),
    }));

    const violacoes = auditar(
      {
        dias: montarDias(inicioIso, fimIso),
        vagas: [],
        pessoas,
        turnos: [...turnosPorId.values()],
        limites: {
          cicloTrabalho: trabalho,
          cicloDescanso: 1,
          maxConsecutivos: Math.min(trabalho, 6),
          horasSemana: cargaSemanal,
          interjornada,
          permitirForaDoPreferido: true,
        },
        historico: historico.map((a) => ({
          pessoaId: a.funcionarioId,
          diaIso: formatDate(a.data),
          turnoId: a.turnoId,
        })),
      },
      escala.alocacoes.map((a) => ({
        diaIso: formatDate(a.data),
        turnoId: a.turnoId,
        indice: 0,
        pessoaId: a.funcionarioId,
        foraDoPreferido: false,
      })),
    );

    // Volta o id da alocação junto, pra tela conseguir levar o gestor
    // direto na linha com problema.
    const idPorChave = new Map(
      escala.alocacoes.map((a) => [
        `${a.funcionarioId}|${formatDate(a.data)}|${a.turnoId}`,
        a.id,
      ]),
    );

    return {
      escalaId,
      totalAlocacoes: escala.alocacoes.length,
      valida: violacoes.length === 0,
      violacoes: violacoes.map((v) => ({
        alocacaoId: idPorChave.get(`${v.pessoaId}|${v.diaIso}|${v.turnoId}`) ?? null,
        funcionarioId: v.pessoaId,
        funcionario: nomePorId.get(v.pessoaId) ?? `#${v.pessoaId}`,
        data: v.diaIso,
        regra: v.regra,
        motivo: MOTIVO[v.regra](nomePorId.get(v.pessoaId) ?? `#${v.pessoaId}`, v.diaIso),
      })),
    };
  }

  // ------------------------------------------------------------
  // Valores das regras globais (gaveta 2 do modelo de regras).
  // Públicos porque o motor de geração precisa dos mesmos números.
  // ------------------------------------------------------------
  buscarIntervaloInterjornada(cliente?: ClientePrisma): Promise<number> {
    return this.buscarValorRegra('intervalo_interjornada', 11, cliente);
  }

  buscarIntervaloIntrajornada(cliente?: ClientePrisma): Promise<number> {
    return this.buscarValorRegra('intervalo_intrajornada', 1, cliente);
  }

  buscarCargaHorariaSemanal(cliente?: ClientePrisma): Promise<number> {
    return this.buscarValorRegra('carga_horaria_semanal', 44, cliente);
  }

  private async buscarValorRegra(
    tipo: string,
    padrao: number,
    cliente?: ClientePrisma,
  ): Promise<number> {
    const db = cliente ?? this.prisma;
    const regra = await db.regra.findFirst({ where: { tipo } });
    const valor = regra ? Number(regra.valor) : NaN;
    return Number.isFinite(valor) ? valor : padrao;
  }
}
