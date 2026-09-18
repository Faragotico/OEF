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

const num = (valor: unknown, padrao = 0): number =>
  typeof valor === "number" ? valor : padrao;

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

export const RAZAO_VAGA_VAZIA: Record<string, string> = {
  "ninguem-habilitado": "ninguém da equipe é habilitado neste turno",
  "equipe-ocupada": "quem podia cobrir já estava escalado em outro turno no mesmo dia",
  "bloqueada-por-regra": "todos os disponíveis esbarraram numa regra trabalhista",
};
