// ============================================================
// restricoes.ts — as regras RN01–RN07, uma vez só.
//
// Cada regra é uma função pura de (estado, candidato) para um veredito.
// Nenhuma toca o banco: o estado que elas leem é mantido em memória e
// atualizado a cada atribuição. Isso muda três coisas em relação à
// versão anterior, em que a validação era um método assíncrono que
// disparava de dez a doze consultas por candidato avaliado:
//
//   1. Custo. Uma geração de mês avaliava milhares de candidatos, cada
//      um com uma dezena de idas ao banco, tudo dentro de uma transação
//      que precisava de 120 segundos de timeout pra não estourar. Aqui
//      cada checagem é O(1) sobre Map, e a transação passa a ter uma
//      única escrita.
//   2. Reversibilidade. Como aplicar e desfazer uma atribuição é
//      barato, o planejador pode TENTAR uma saída, ver que não prestou
//      e voltar atrás. Com validação no banco isso era impensável, e
//      por isso a versão anterior era um greedy sem volta: o coringa
//      pegava a primeira folga que passava e nunca reconsiderava.
//   3. Uma definição só. As mesmas funções servem a geração automática
//      e o "Validar Escala" (UC06). Antes eram dois caminhos que
//      podiam divergir — e divergiam: a fórmula do rodízio decidia
//      folga por um critério, a validação no banco por outro.
//
// RN01 (funcionário inativo) e RN03 (data fora do período) não
// aparecem aqui de propósito. As duas são filtro de entrada, não regra
// de decisão: quem está inativo não entra em `pessoas`, e toda vaga do
// problema já nasce dentro do período. Regra que não pode ser violada
// por construção não merece ser checada num laço quente.
// ============================================================
import {
  type CodigoRegra,
  type Dia,
  type DiaIso,
  type Limites,
  type Pessoa,
  type RegistroHistorico,
  type SemanaIso,
  type Turno,
  desloca,
} from './modelo';

export type Veredito = { ok: true } | { ok: false; regra: CodigoRegra };

const OK: Veredito = { ok: true };
const falha = (regra: CodigoRegra): Veredito => ({ ok: false, regra });

// ------------------------------------------------------------
// Estado
// ------------------------------------------------------------

export interface EstadoPessoa {
  /** dia ISO -> turno que ela cobre nele. Inclui o HISTÓRICO (os dias
   *  anteriores ao período, lidos do banco), e é isso que faz o
   *  espaçamento continuar certo na virada do mês. */
  turnoPorDia: Map<DiaIso, number>;
  /** semana ISO -> horas efetivas já somadas nela. */
  horasPorSemana: Map<SemanaIso, number>;
  /** Dias trabalhados dentro do período (sem o histórico) — o
   *  planejador usa pra equilibrar a carga entre as pessoas. */
  diasNoPeriodo: number;
  /** Domingos do período em que ela foi escalada. */
  domingosTrabalhados: number;
}

export interface Estado {
  porPessoa: Map<number, EstadoPessoa>;
}

export interface Candidato {
  pessoa: Pessoa;
  dia: Dia;
  turno: Turno;
}

export function criarEstado(
  pessoas: Pessoa[],
  historico: RegistroHistorico[],
  turnosPorId: Map<number, Turno>,
  semanaDe: (iso: DiaIso) => SemanaIso,
): Estado {
  const porPessoa = new Map<number, EstadoPessoa>(
    pessoas.map((p) => [
      p.id,
      {
        turnoPorDia: new Map<DiaIso, number>(),
        horasPorSemana: new Map<SemanaIso, number>(),
        diasNoPeriodo: 0,
        domingosTrabalhados: 0,
      },
    ]),
  );

  // O histórico entra no turnoPorDia (pra contar dias seguidos e
  // interjornada na virada) e nas horas da semana — a semana ISO que
  // atravessa o começo do período já vem com horas gastas, e o RN04
  // precisa enxergar isso.
  for (const registro of historico) {
    const estado = porPessoa.get(registro.pessoaId);
    const turno = turnosPorId.get(registro.turnoId);
    if (!estado || !turno) continue;
    estado.turnoPorDia.set(registro.diaIso, registro.turnoId);
    const semana = semanaDe(registro.diaIso);
    estado.horasPorSemana.set(
      semana,
      (estado.horasPorSemana.get(semana) ?? 0) + turno.duracaoEfetiva,
    );
  }

  return { porPessoa };
}

export function aplicar(estado: Estado, c: Candidato): void {
  const ep = estado.porPessoa.get(c.pessoa.id)!;
  ep.turnoPorDia.set(c.dia.iso, c.turno.id);
  ep.horasPorSemana.set(
    c.dia.semanaIso,
    (ep.horasPorSemana.get(c.dia.semanaIso) ?? 0) + c.turno.duracaoEfetiva,
  );
  ep.diasNoPeriodo++;
  if (c.dia.diaDaSemana === 0) ep.domingosTrabalhados++;
}

export function desfazer(estado: Estado, c: Candidato): void {
  const ep = estado.porPessoa.get(c.pessoa.id)!;
  ep.turnoPorDia.delete(c.dia.iso);
  ep.horasPorSemana.set(
    c.dia.semanaIso,
    (ep.horasPorSemana.get(c.dia.semanaIso) ?? 0) - c.turno.duracaoEfetiva,
  );
  ep.diasNoPeriodo--;
  if (c.dia.diaDaSemana === 0) ep.domingosTrabalhados--;
}

// ------------------------------------------------------------
// As regras
// ------------------------------------------------------------

/**
 * Qualificação: a pessoa está habilitada nesse turno?
 *
 * Titular só cobre o próprio horário, salvo se o gestor liberar. É o
 * que os quadros reais mostram — cada pessoa no mesmo horário o mês
 * inteiro — e é a diferença entre uma escala que a equipe reconhece e
 * um quebra-cabeça ótimo que ninguém quer cumprir.
 *
 * Quando o gestor LIBERA, a liberação vale para os titulares e só para
 * eles: um titular passa a caber em qualquer turno da grade, e o
 * coringa continua preso à qualificação que o cadastro deu a ele.
 * Tem que ser assim porque as duas listas significam coisas
 * diferentes — a do titular é "onde ele normalmente trabalha", a do
 * coringa é "o que ele sabe cobrir". Exigir habilitação explícita do
 * titular também deixava a opção sem efeito nenhum na prática:
 * ninguém cadastra habilitação extra para quem já tem horário fixo, e
 * a caixa ficava marcada sem mudar uma vaga sequer.
 */
function habilitacao(c: Candidato, limites: Limites): Veredito {
  const ehTitular = c.pessoa.turnoPreferido !== null;

  if (ehTitular && limites.permitirForaDoPreferido) return OK;

  if (!c.pessoa.turnosHabilitados.includes(c.turno.id)) {
    return falha('nao-habilitado');
  }
  if (ehTitular && c.pessoa.turnoPreferido !== c.turno.id) {
    return falha('nao-habilitado');
  }
  return OK;
}

/** Ex: "este titular nunca trabalha domingo". */
function diaDaSemanaVetado(c: Candidato): Veredito {
  return c.pessoa.nuncaNosDiasDaSemana.has(c.dia.diaDaSemana)
    ? falha('dia-da-semana-vetado')
    : OK;
}

/** RN02 — ausência registrada (férias, atestado). */
function rn02Ausencia(c: Candidato): Veredito {
  return c.pessoa.ausencias.has(c.dia.iso) ? falha('RN02') : OK;
}

/** Conflito: a pessoa já cobre outra vaga nesse mesmo dia. */
function conflitoNoDia(ep: EstadoPessoa, c: Candidato): Veredito {
  return ep.turnoPorDia.has(c.dia.iso) ? falha('conflito') : OK;
}

/**
 * RN05 — interjornada, NOS DOIS SENTIDOS.
 *
 * A versão anterior só olhava pra trás, e estava certa naquele
 * desenho: ela preenchia o mês em ordem cronológica estrita, então o
 * dia seguinte ainda não existia. Aqui o planejador preenche a vaga
 * mais difícil primeiro, e a ordem não é a do calendário — checar só o
 * dia anterior deixaria passar uma alocação que quebra a de amanhã,
 * feita dez passos atrás.
 */
function rn05Interjornada(
  ep: EstadoPessoa,
  c: Candidato,
  turnosPorId: Map<number, Turno>,
  minimo: number,
): Veredito {
  const ontem = ep.turnoPorDia.get(desloca(c.dia.iso, -1));
  if (ontem !== undefined) {
    const turnoOntem = turnosPorId.get(ontem)!;
    if (24 - turnoOntem.fim + c.turno.inicio < minimo) return falha('RN05');
  }
  const amanha = ep.turnoPorDia.get(desloca(c.dia.iso, 1));
  if (amanha !== undefined) {
    const turnoAmanha = turnosPorId.get(amanha)!;
    if (24 - c.turno.fim + turnoAmanha.inicio < minimo) return falha('RN05');
  }
  return OK;
}

/**
 * Tamanho da sequência de dias trabalhados que se forma se essa
 * alocação acontecer — contando pra trás E pra frente, pela mesma razão
 * do RN05. Para de contar assim que passa do teto, pra não varrer o mês
 * inteiro à toa.
 */
function corridaAoRedor(
  ep: EstadoPessoa,
  iso: DiaIso,
  teto: number,
): number {
  let total = 1;
  for (let d = desloca(iso, -1); ep.turnoPorDia.has(d); d = desloca(d, -1)) {
    if (++total > teto) return total;
  }
  for (let d = desloca(iso, 1); ep.turnoPorDia.has(d); d = desloca(d, 1)) {
    if (++total > teto) return total;
  }
  return total;
}

/**
 * RN06 (dias seguidos que a regra de escala permite) e RN07 (o piso
 * legal de 6 dias do descanso semanal remunerado) são a mesma conta com
 * tetos diferentes, então saem de uma varredura só. `maxConsecutivos`
 * já chega como o menor dos dois.
 */
function rn06rn07Consecutivos(
  ep: EstadoPessoa,
  c: Candidato,
  limites: Limites,
): Veredito {
  const corrida = corridaAoRedor(ep, c.dia.iso, Math.max(limites.maxConsecutivos, 6));
  if (corrida > 6) return falha('RN07');
  if (corrida > limites.maxConsecutivos) return falha('RN06');
  return OK;
}

/** RN04 — teto de horas efetivas na semana ISO. */
function rn04CargaSemanal(
  ep: EstadoPessoa,
  c: Candidato,
  limites: Limites,
): Veredito {
  const acumulado = ep.horasPorSemana.get(c.dia.semanaIso) ?? 0;
  return acumulado + c.turno.duracaoEfetiva > limites.horasSemana
    ? falha('RN04')
    : OK;
}

/**
 * Roda todas as restrições duras na ordem do mais barato pro mais caro.
 * A ordem importa: é este o laço mais quente do motor, e sair na
 * primeira falha economiza as checagens seguintes.
 */
export function verificar(
  estado: Estado,
  c: Candidato,
  limites: Limites,
  turnosPorId: Map<number, Turno>,
): Veredito {
  const ep = estado.porPessoa.get(c.pessoa.id)!;

  let v = habilitacao(c, limites);
  if (!v.ok) return v;
  v = diaDaSemanaVetado(c);
  if (!v.ok) return v;
  v = conflitoNoDia(ep, c);
  if (!v.ok) return v;
  v = rn02Ausencia(c);
  if (!v.ok) return v;
  v = rn04CargaSemanal(ep, c, limites);
  if (!v.ok) return v;
  v = rn05Interjornada(ep, c, turnosPorId, limites.interjornada);
  if (!v.ok) return v;
  return rn06rn07Consecutivos(ep, c, limites);
}
