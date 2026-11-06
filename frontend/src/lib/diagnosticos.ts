// ============================================================
// diagnosticos.ts — o texto de cada aviso da geração, num lugar só.
//
// O backend devolve CÓDIGO e DADOS; a frase mora aqui. Antes era o
// contrário: a resposta trazia cinco campos `avisoX: string | null`
// com o parágrafo já montado, e a tela só sabia despejar cada um num
// retângulo vermelho idêntico. Isso tinha três problemas:
//
//   - a tela não sabia a GRAVIDADE de nada, então um erro de cadastro
//     que impede gerar a escala aparecia igualzinho a um aviso de
//     "junho tem só 4 domingos";
//   - a mesma informação (quantas vagas ficaram sem cobertura, por
//     exemplo) era escrita de um jeito no aviso, de outro na lista e de
//     um terceiro no PDF;
//   - acrescentar um aviso novo era acrescentar um campo na API, um
//     `if` no componente e mais um retângulo.
//
// Agora acrescentar um diagnóstico é acrescentar uma linha aqui.
// ============================================================

export type NivelDiagnostico = "erro" | "aviso" | "info";

export type Diagnostico = {
  codigo: string;
  nivel: NivelDiagnostico;
  dados: Record<string, unknown>;
};

export type DiagnosticoLegivel = {
  nivel: NivelDiagnostico;
  titulo: string;
  detalhe: string;
  /** O que o gestor pode FAZER a respeito. Vazio quando não há o que fazer. */
  acao?: string;
};

const listaDeNomes = (valor: unknown): string => {
  if (!Array.isArray(valor)) return "";
  return valor
    .map((p) => (typeof p === "object" && p !== null && "nome" in p ? String((p as { nome: unknown }).nome) : String(p)))
    .join(", ");
};

// [{ nome: "14:00–22:00", dias: ["2026-12-04", ...] }] -> "14:00–22:00: 04/12, 05/12"
const listaDeTurnos = (valor: unknown): string => {
  if (!Array.isArray(valor)) return "";
  return valor
    .map((t) => {
      const turno = t as { nome?: unknown; dias?: unknown };
      const dias = Array.isArray(turno.dias)
        ? turno.dias.map((dia) => diaMes(String(dia))).join(", ")
        : "";
      return `${turno.nome}: ${dias}`;
    })
    .join(" · ");
};

const num = (valor: unknown, padrao = 0): number =>
  typeof valor === "number" ? valor : padrao;

type PessoaAcimaDaCarga = {
  nome: string;
  carga: number;
  semanas: { inicio: string; horas: number }[];
};
type PessoaEmOutraEscala = {
  nome: string;
  escalas: { posto: string; dias: number; mesmoDia: string[] }[];
};
const lista = <T,>(valor: unknown): T[] => (Array.isArray(valor) ? (valor as T[]) : []);

const TRADUTORES: Record<string, (d: Record<string, unknown>) => DiagnosticoLegivel> = {
  "turno-sem-ninguem-habilitado": (d) => ({
    nivel: "erro",
    titulo: `Nenhum funcionário pode cobrir o turno ${d.nome ?? `#${d.turnoId}`}`,
    detalhe:
      "Este turno faz parte da grade do posto, mas ninguém da equipe tem ele como horário de casa nem está habilitado nele.",
    acao:
      "Defina o turno padrão de alguém como este, marque a habilitação de um coringa, ou zere a demanda deste turno na tela de Turnos.",
  }),

  "demanda-acima-da-equipe": (d) => ({
    nivel: "erro",
    titulo: "A demanda de um dia passa do tamanho da equipe",
    detalhe: `Há dia pedindo ${num(d.maiorDemanda)} pessoas, e o posto tem ${num(d.pessoasNoPosto)} cadastradas. Nem com todo mundo trabalhando fecha.`,
    acao: "Reduza a demanda dos turnos ou vincule mais gente ao posto.",
  }),

  "pessoal-insuficiente": (d) => ({
    nivel: "aviso",
    titulo: `Faltam cerca de ${num(d.pessoasFaltando)} pessoa(s) pra esta grade`,
    detalhe:
      `A grade pede ${num(d.vagas)} coberturas no período e a equipe atual dá conta de ${num(d.capacidade)}. ` +
      `Num rodízio ${d.ciclo}, cada pessoa trabalha no máximo ${String(d.ciclo).split("x")[0]} de cada ${Number(String(d.ciclo).split("x")[0]) + Number(String(d.ciclo).split("x")[1])} dias — o resto é folga obrigatória.`,
    acao:
      "Contrate ou vincule mais gente, reduza a demanda de algum turno, ou escolha um rodízio com mais dias trabalhados.",
  }),

  "sem-domingo-de-folga": (d) => ({
    nivel: "aviso",
    titulo: `Sem domingo de folga: ${listaDeNomes(d.pessoas)}`,
    detalhe:
      `O período tem ${num(d.domingosNoPeriodo)} domingo(s) e o posto tem ${num(d.pessoasNoPosto)} pessoas. ` +
      "Como a demanda de domingo ocupa quase todo mundo, não sobra folga dominical pra todos — é aritmética, não falha do rodízio.",
    acao:
      "Reduza a demanda de domingo na tela de Turnos (o jeito mais direto), ou ajuste manualmente na grade.",
  }),

  "interjornada-impossivel": (d) => ({
    nivel: "aviso",
    titulo: `${num(d.vagasAfetadas)} vaga(s) ficaram vazias por intervalo entre turnos`,
    detalhe:
      `Quem poderia cobrir essas vagas não teria as ${num(d.minimoHoras)}h de descanso entre o fim de um turno e o início do outro (RN05). ` +
      "Acontece quando os horários do posto fecham tarde e abrem cedo.",
    acao:
      "Um segundo coringa resolve, porque a cadeia de coberturas deixa de cair sempre na mesma pessoa. Rever o horário de abertura também.",
  }),

  "vagas-descobertas": (d) => ({
    nivel: "aviso",
    titulo: `${num(d.total)} vaga(s) sem ninguém`,
    detalhe: listaDeTurnos(d.turnos),
    acao: "Aloque alguém nesses dias (a grade deixa trazer funcionário de outro posto) ou ajuste a demanda do turno.",
  }),

  "cobertura-acima": (d) => ({
    nivel: "info",
    titulo: `${num(d.total)} alocação(ões) além da demanda do turno`,
    detalhe: listaDeTurnos(d.turnos),
  }),

  // A carga cadastrada no funcionário (ex.: 30h). Só aviso: pode ser hora
  // extra combinada. Não confundir com a RN04, o teto legal do sistema.
  "acima-da-carga-contratual": (d) => {
    const pessoas = lista<PessoaAcimaDaCarga>(d.pessoas);
    return {
      nivel: "aviso",
      titulo: `Acima da carga horária do contrato: ${listaDeNomes(pessoas)}`,
      detalhe: pessoas
        .map(
          (p) =>
            `${p.nome} (contrato de ${p.carga}h): ` +
            p.semanas
              .map((s) => `${horasEMinutos(s.horas)} na semana de ${diaMes(s.inicio)}`)
              .join(", "),
        )
        .join(" · "),
      acao:
        "Se não for hora extra combinada, troque alguns dias na grade ou confira a carga horária no cadastro do funcionário.",
    };
  },

  // Coringa ou emprestado que também está na escala de outro posto. A
  // geração e a validação olham uma escala por vez e não somam as duas.
  "em-outra-escala": (d) => {
    const pessoas = lista<PessoaEmOutraEscala>(d.pessoas);
    return {
      nivel: "aviso",
      titulo: `Também escalados em outro posto no período: ${listaDeNomes(pessoas)}`,
      detalhe: pessoas
        .map(
          (p) =>
            `${p.nome}: ` +
            p.escalas
              .map(
                (e) =>
                  `${e.dias} dia(s) em ${e.posto}` +
                  (e.mesmoDia.length > 0
                    ? ` — no MESMO dia que aqui: ${e.mesmoDia.map(diaMes).join(", ")}`
                    : ""),
              )
              .join("; "),
        )
        .join(" · "),
      acao:
        "As regras (dias seguidos, horas na semana, descanso) são conferidas em cada escala separadamente. Confira essas pessoas e, se houver dia repetido, tire-as de uma das escalas.",
    };
  },

  "carga-semanal-estoura": (d) => ({
    nivel: "aviso",
    titulo: `${num(d.vagasAfetadas)} vaga(s) ficaram vazias por carga horária semanal`,
    detalhe: `Quem poderia cobrir passaria das ${num(d.limiteHoras)}h efetivas na semana (RN04, já descontado o intervalo intrajornada).`,
    acao: "Com turnos longos, o rodízio escolhido não cabe no limite semanal — reveja a duração dos turnos ou o padrão de rodízio.",
  }),
};

export function traduzir(diagnostico: Diagnostico): DiagnosticoLegivel {
  const tradutor = TRADUTORES[diagnostico.codigo];
  if (tradutor) return tradutor(diagnostico.dados);
  // Diagnóstico novo no backend e ainda não traduzido aqui: melhor
  // mostrar o código do que engolir a informação em silêncio.
  return {
    nivel: diagnostico.nivel,
    titulo: diagnostico.codigo,
    detalhe: JSON.stringify(diagnostico.dados),
  };
}

// ------------------------------------------------------------
// Motivos de folga e de vaga vazia — mesma ideia, código na API e
// frase aqui.
// ------------------------------------------------------------

export const MOTIVO_FOLGA: Record<string, string> = {
  "feriado-master":
    "Feriado nacional (Ano Novo, Páscoa, Dia do Trabalhador ou Natal) — o posto não abre por padrão do sistema.",
  rodizio: "Folga do rodízio: a demanda do dia já estava coberta pelo resto da equipe.",
  ausencia: "Ausência registrada (férias, atestado, etc).",
  "bloqueio-de-regra": "Não podia trabalhar hoje por regra trabalhista.",
};

export const REGRA_CURTA: Record<string, string> = {
  RN01: "funcionário inativo",
  RN02: "ausência registrada",
  RN04: "carga horária semanal",
  RN05: "intervalo entre jornadas",
  RN06: "dias seguidos do rodízio",
  RN07: "descanso semanal remunerado",
  conflito: "já alocado neste dia",
  "nao-habilitado": "não habilitado neste turno",
  "dia-da-semana-vetado": "não trabalha neste dia da semana",
};

export type DetalheViolacao =
  | { tipo: "corrida"; inicio: string; fim: string; dias: number }
  | { tipo: "descanso"; de: string; para: string; horas: number }
  | null;

export type ViolacaoApi = {
  alocacaoId: number | null;
  funcionarioId: number;
  funcionario: string;
  data: string;
  regra: string;
  limite: number | null;
  detalhe: DetalheViolacao;
  motivo: string;
};

// "2026-12-02" -> "02/12"
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// 9.75 -> "9h45", 11 -> "11h"
function horasEMinutos(horas: number): string {
  const total = Math.round(horas * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

// Transforma as violações de UMA pessoa em frases que se leem sozinhas.
// A auditoria acusa alocação por alocação (e só a primeira regra que
// falhou), então um problema só — "6 dias seguidos" — chega como 4
// violações. Aqui elas se juntam: uma frase por sequência, uma por par
// de dias com pouco descanso, e as demais regras listam as datas.
export function descreverViolacoes(violacoes: ViolacaoApi[]): string[] {
  const ordenadas = [...violacoes].sort((a, b) => a.data.localeCompare(b.data));
  const frases: string[] = [];
  const vistos = new Set<string>();
  const outras = new Map<string, { limite: number | null; datas: string[] }>();

  for (const v of ordenadas) {
    const d = v.detalhe;
    if (d?.tipo === "corrida") {
      const chave = `corrida|${d.inicio}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const maximo = v.regra === "RN07" ? 6 : v.limite;
      frases.push(
        `${d.dias} dias seguidos de trabalho (${diaMes(d.inicio)} a ${diaMes(d.fim)}) — o máximo é ${maximo}`,
      );
    } else if (d?.tipo === "descanso") {
      const chave = `descanso|${d.de}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      frases.push(
        `Só ${horasEMinutos(d.horas)} de descanso entre ${diaMes(d.de)} e ${diaMes(d.para)} — o mínimo é ${v.limite}h`,
      );
    } else {
      const grupo = outras.get(v.regra) ?? { limite: v.limite, datas: [] };
      grupo.datas.push(v.data);
      outras.set(v.regra, grupo);
    }
  }

  for (const [regra, { limite, datas }] of outras) {
    frases.push(`${textoViolacao(regra, limite)}: ${datas.map(diaMes).join(", ")}`);
  }
  return frases;
}

// Frase curta de uma violação sem detalhe (carga semanal, ausência…). A
// API manda o código da regra e o limite; a frase mora aqui.
export function textoViolacao(regra: string, limite: number | null): string {
  switch (regra) {
    case "RN04":
      return `Passa de ${limite}h na semana`;
    case "RN05":
      return `Menos de ${limite}h de descanso entre turnos`;
    case "RN06":
      return `Mais de ${limite} dias seguidos`;
    case "RN07":
      return "7 dias seguidos sem folga";
    case "RN02":
      return "Trabalha em dia de ausência";
    case "RN01":
      return "Funcionário inativo";
    case "conflito":
      return "Dois turnos no mesmo dia";
    default: {
      const curta = REGRA_CURTA[regra] ?? regra;
      return curta.charAt(0).toUpperCase() + curta.slice(1);
    }
  }
}

export const RAZAO_VAGA_VAZIA: Record<string, string> = {
  "ninguem-habilitado": "ninguém da equipe é habilitado neste turno",
  "equipe-ocupada": "quem podia cobrir já estava escalado em outro turno no mesmo dia",
  "bloqueada-por-regra": "todos os disponíveis esbarraram numa regra trabalhista",
};
