// ============================================================
// modelo.ts — o vocabulário do motor de escala.
//
// Aqui não tem regra, não tem algoritmo e não tem Prisma: só os TIPOS
// que descrevem o problema que o planejador resolve e o plano que ele
// devolve. É de propósito: enquanto o problema não estiver escrito como
// dado puro, qualquer regra acaba tendo que ir buscar informação no
// banco no meio da conta — foi exatamente assim que a versão anterior
// terminou com duas fontes de verdade (uma fórmula em memória decidindo
// folga e uma validação no banco decidindo outra coisa).
//
// A INVERSÃO EM RELAÇÃO À VERSÃO ANTERIOR
//
// Antes: a unidade de decisão era (pessoa, dia) -> trabalha ou folga.
// O turno era propriedade da pessoa e o motor só escolhia quando cada
// um descansava, por uma fórmula de módulo.
//
// Agora: a unidade de decisão é a VAGA — (dia, turno, índice) -> quem
// cobre. O posto declara de quanta gente precisa em cada turno de cada
// dia; o planejador preenche. Folga é o resíduo: quem não ficou com
// nenhuma vaga naquele dia está de folga.
//
// Três coisas caem fora de graça com essa inversão:
//
//   1. "Só uma pessoa folga por dia" deixa de ser um truque do módulo e
//      vira aritmética da demanda: 5 vagas por dia e 6 pessoas dão
//      exatamente 1 folga por dia, sem ninguém programar isso.
//   2. O coringa deixa de ser caso especial. Ele é só alguém sem turno
//      preferido, habilitado em vários — o mesmo código serve aos dois.
//   3. O buraco de cobertura passa a ter a forma certa: "o turno 14–22
//      do dia 12 está vazio", e não "a folga do Sérgio ficou descoberta".
//      É a primeira que interessa pro gestor e pra porta da loja.
// ============================================================

/** Data pura no formato "AAAA-MM-DD". */
export type DiaIso = string;

/** Chave da semana ISO (segunda a domingo), ex: "2026-W11". */
export type SemanaIso = string;

// ------------------------------------------------------------
// Entrada
// ------------------------------------------------------------

/**
 * Um turno do posto. Horários em HORAS DECIMAIS (07:45 = 7.75) porque
 * o motor faz conta de intervalo o tempo todo e montar Date a cada
 * comparação só gera ruído.
 *
 * `duracaoEfetiva` já vem com o intervalo intrajornada descontado: o
 * limite semanal (RN04) é sobre hora trabalhada, não sobre hora de
 * turno. Descontar aqui, uma vez, evita que cada lugar que soma horas
 * invente seu próprio número (era o caso do PDF vs. a validação).
 */
export interface Turno {
  id: number;
  nome: string;
  /** Hora de início, decimal. */
  inicio: number;
  /** Hora de fim, decimal. Sempre > inicio: turno não atravessa a
   *  meia-noite neste sistema (limitação declarada, R5 da auditoria). */
  fim: number;
  /** Horas efetivamente trabalhadas, já sem a pausa intrajornada. */
  duracaoEfetiva: number;
}

/**
 * Um dia do período, com tudo que as regras precisam saber sobre ele já
 * calculado. `semanaIso` entra aqui e não é derivado na hora porque o
 * RN04 consulta essa chave uma vez por candidato avaliado — são dezenas
 * de milhares de consultas numa geração.
 */
export interface Dia {
  iso: DiaIso;
  /** 0 = domingo, 6 = sábado. */
  diaDaSemana: number;
  /** Ano Novo, Páscoa, Dia do Trabalhador ou Natal: folga geral por
   *  padrão do sistema. Nesses dias o posto não abre vaga nenhuma. */
  ehFeriadoMaster: boolean;
  semanaIso: SemanaIso;
}

/**
 * Uma unidade de cobertura a preencher. Quando a demanda de um turno
 * num dia é 2, existem duas vagas com o mesmo (diaIso, turnoId) e
 * `indice` 0 e 1 — assim a vaga continua sendo a unidade atômica do
 * problema, sem nenhum lugar precisar carregar "quantos faltam".
 */
export interface Vaga {
  diaIso: DiaIso;
  turnoId: number;
  indice: number;
}

/**
 * Quem pode ser escalado.
 *
 * `turnosHabilitados` é a qualificação: em que turnos essa pessoa PODE
 * entrar. `turnoPreferido` é o horário de casa dela — o "turno padrão"
 * da versão anterior. Um titular tem preferido e (por padrão) só é
 * aceito nele; um coringa tem `turnoPreferido: null` e vários
 * habilitados. A diferença entre os dois deixou de ser um `if` no meio
 * do motor e virou dado.
 *
 * `nuncaNosDiasDaSemana` cobre o caso real de titulares que nunca
 * trabalham domingo — era um dos espaços em branco do modelo
 * anterior.
 */
export interface Pessoa {
  id: number;
  nome: string;
  turnosHabilitados: number[];
  turnoPreferido: number | null;
  /** Datas ISO em que a pessoa está ausente (férias, atestado, etc). */
  ausencias: Set<DiaIso>;
  /** Dias da semana (0 = domingo) em que essa pessoa nunca é escalada. */
  nuncaNosDiasDaSemana: Set<number>;
}

export interface Limites {
  /** Dias trabalhados do ciclo (o "5" do 5x1). */
  cicloTrabalho: number;
  /** Dias de descanso do ciclo (o "1" do 5x1). */
  cicloDescanso: number;
  /** Máximo de dias seguidos trabalhados: o menor entre o ciclo (RN06)
   *  e as 6 do descanso semanal remunerado (RN07). */
  maxConsecutivos: number;
  /** Horas efetivas por semana ISO (RN04, padrão 44). */
  horasSemana: number;
  /** Intervalo mínimo entre o fim de um turno e o início do próximo
   *  (RN05, padrão 11). */
  interjornada: number;
  /**
   * Se um titular pode cobrir turno que não é o dele.
   *
   * Padrão `false`, porque é o que os quadros reais mostram: cada
   * pessoa no mesmo horário o mês inteiro. Ligar isso dá ao planejador
   * muito mais saída (em especial pra garantir domingo de folga), ao
   * custo de uma escala em que o horário de cada um muda — decisão do
   * gestor, não do motor.
   */
  permitirForaDoPreferido: boolean;
}

/**
 * Dias JÁ TRABALHADOS imediatamente antes do período, lidos do banco.
 *
 * Isto conserta um erro silencioso da versão anterior: o cálculo de
 * espaçamento olhava só os dias do período, então quem tinha trabalhado
 * os últimos cinco dias de fevereiro começava março com o contador
 * zerado no plano — enquanto o RN06 no banco enxergava o histórico e
 * bloqueava a alocação. Plano e validação discordavam em toda virada de
 * mês, por construção.
 */
export interface RegistroHistorico {
  pessoaId: number;
  diaIso: DiaIso;
  turnoId: number;
}

export interface ProblemaEscala {
  dias: Dia[];
  vagas: Vaga[];
  pessoas: Pessoa[];
  turnos: Turno[];
  limites: Limites;
  historico: RegistroHistorico[];
}

// ------------------------------------------------------------
// Saída
// ------------------------------------------------------------

export type CodigoRegra =
  | 'RN01' // funcionário inativo
  | 'RN02' // ausência registrada
  | 'RN04' // carga horária semanal
  | 'RN05' // interjornada
  | 'RN06' // dias consecutivos da regra de escala
  | 'RN07' // descanso semanal remunerado
  | 'conflito' // já alocado nesse dia
  | 'nao-habilitado' // turno fora da qualificação da pessoa
  | 'dia-da-semana-vetado'; // ex: "nunca trabalha domingo"

/**
 * Por que a pessoa não está trabalhando nesse dia. É CÓDIGO, não frase:
 * a versão anterior montava o texto no backend, o que deixava a mesma
 * informação em cinco formatos diferentes e obrigava o frontend a
 * exibir parágrafo pronto. O texto agora mora num lugar só, na ponta.
 */
export type MotivoFolga =
  | 'feriado-master'
  | 'rodizio' // não havia vaga sobrando pra ela hoje
  | 'ausencia'
  | 'bloqueio-de-regra'; // alguma RN impediu todas as vagas do dia

export interface Folga {
  pessoaId: number;
  diaIso: DiaIso;
  motivo: MotivoFolga;
  /** Preenchido quando motivo é 'bloqueio-de-regra'. */
  regra?: CodigoRegra;
}

export type RazaoVagaVazia =
  /** Ninguém no posto tem qualificação pra esse turno. */
  | 'ninguem-habilitado'
  /** Quem podia já está escalado em outro turno no mesmo dia. */
  | 'equipe-ocupada'
  /** Havia gente livre e habilitada, mas toda ela esbarrou numa regra. */
  | 'bloqueada-por-regra';

export interface VagaVazia {
  diaIso: DiaIso;
  turnoId: number;
  indice: number;
  razao: RazaoVagaVazia;
  /** Quem foi considerado e em que regra bateu — é o que transforma
   *  "não deu" em "não deu por isso". */
  bloqueios: { pessoaId: number; regra: CodigoRegra }[];
}

export interface Atribuicao {
  diaIso: DiaIso;
  turnoId: number;
  indice: number;
  pessoaId: number;
  /** true quando a pessoa está cobrindo turno que não é o dela — é o
   *  que o PDF mostra como cobertura e a grade destaca. */
  foraDoPreferido: boolean;
}

export type CodigoDiagnostico =
  | 'sem-domingo-de-folga'
  | 'pessoal-insuficiente'
  | 'interjornada-impossivel'
  | 'carga-semanal-estoura'
  | 'turno-sem-ninguem-habilitado'
  | 'demanda-acima-da-equipe';

export interface Diagnostico {
  codigo: CodigoDiagnostico;
  nivel: 'erro' | 'aviso' | 'info';
  /** Os números e nomes que a frase na UI vai precisar. Sem texto. */
  dados: Record<string, unknown>;
}

export interface PlanoEscala {
  atribuicoes: Atribuicao[];
  folgas: Folga[];
  vagasVazias: VagaVazia[];
  diagnosticos: Diagnostico[];
  /** Quantas trocas o passo de reparo conseguiu fazer — serve de sinal
   *  de qualidade nos testes e de nota de rodapé na tela. */
  reparosAplicados: number;
}

// ------------------------------------------------------------
// Utilitários de data
//
// O motor inteiro trabalha com "AAAA-MM-DD" em vez de Date. Date traz
// fuso, horário de verão e comparação por referência — três fontes de
// bug que não têm nada a ver com o problema. Aritmética de dia em cima
// da string, com UTC explícito, não tem nenhuma delas.
// ------------------------------------------------------------

const MS_POR_DIA = 86_400_000;

// `desloca` é chamada centenas de milhares de vezes por geração (cada
// checagem de interjornada e de dias seguidos anda pelo calendário), e
// Date.parse + toISOString custa caro pro que ela faz. O memo derruba
// o custo a uma busca em Map — as datas se repetem o tempo todo, já que
// o universo é o mês sendo planejado mais uma semana de histórico.
const memoDesloca = new Map<string, DiaIso>();

export function desloca(iso: DiaIso, dias: number): DiaIso {
  const chave = `${iso}${dias}`;
  const pronto = memoDesloca.get(chave);
  if (pronto !== undefined) return pronto;
  const resultado = new Date(Date.parse(`${iso}T00:00:00Z`) + dias * MS_POR_DIA)
    .toISOString()
    .slice(0, 10);
  memoDesloca.set(chave, resultado);
  return resultado;
}

export function diaDaSemanaDe(iso: DiaIso): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Chave da semana ISO que contém a data (segunda a domingo). */
export function semanaIsoDe(iso: DiaIso): SemanaIso {
  const d = new Date(`${iso}T00:00:00Z`);
  const diaSemana = d.getUTCDay() || 7; // domingo (0) vira 7
  d.setUTCDate(d.getUTCDate() + 4 - diaSemana); // quinta da mesma semana
  const ano = d.getUTCFullYear();
  const primeiraQuinta = new Date(Date.UTC(ano, 0, 4));
  const deslocamento = (primeiraQuinta.getUTCDay() || 7) - 1;
  primeiraQuinta.setUTCDate(primeiraQuinta.getUTCDate() - deslocamento);
  const semana =
    1 + Math.round((d.getTime() - primeiraQuinta.getTime()) / (7 * MS_POR_DIA));
  return `${ano}-W${String(semana).padStart(2, '0')}`;
}

export const chaveVaga = (v: { diaIso: DiaIso; turnoId: number; indice: number }) =>
  `${v.diaIso}|${v.turnoId}|${v.indice}`;
