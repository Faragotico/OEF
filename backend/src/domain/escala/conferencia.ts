// ============================================================
// conferencia.ts — conferências do RESULTADO de uma escala que não são
// regra trabalhista (RN01–RN07), mas que o gestor precisa saber.
//
// Moram aqui, e não dentro do planejador, porque DOIS lugares precisam
// da mesma conta: a geração (que avisa ao terminar) e o "Validar
// escala" (que reexamina uma escala já salva, depois de edição manual).
// Antes o aviso "sem domingo de folga" existia só na geração — então
// uma escala podia gerar o aviso e passar limpa na validação.
//
// São funções puras: recebem o resultado já montado e devolvem os
// achados. Quem sabe de banco é o serviço que chama.
// ============================================================
import { type Dia, type DiaIso, desloca, diaDaSemanaDe } from './modelo';

/**
 * Quem não ganhou nenhum domingo de folga no período.
 *
 * Feriado master em domingo (a Páscoa é sempre um) fecha o posto: todo
 * mundo já tem domingo de folga, não há o que avisar. Foi um aviso falso
 * real em abril/2026.
 */
export function semDomingoDeFolga<P extends { id: number; nome: string }>(
  dias: Dia[],
  pessoas: P[],
  trabalhou: (pessoaId: number, diaIso: DiaIso) => boolean,
): { pessoas: P[]; domingosNoPeriodo: number } {
  const domingoFeriado = dias.some((d) => d.diaDaSemana === 0 && d.ehFeriadoMaster);
  const domingos = dias.filter((d) => d.diaDaSemana === 0 && !d.ehFeriadoMaster);
  if (domingoFeriado || domingos.length === 0) {
    return { pessoas: [], domingosNoPeriodo: domingos.length };
  }
  return {
    pessoas: pessoas.filter((p) => domingos.every((d) => trabalhou(p.id, d.iso))),
    domingosNoPeriodo: domingos.length,
  };
}

export interface TurnoDoPosto {
  /** Identifica o horário (início-fim). A cobertura casa por HORÁRIO, não
   *  por id, porque "horário personalizado" cria um turno avulso com o
   *  mesmo horário de um turno do posto — e é a mesma vaga. */
  chave: string;
  nome: string;
  /** Pessoas pedidas por dia da semana (0 = domingo). */
  demandaPorDiaDaSemana: number[];
}

export interface DiasPorTurno {
  nome: string;
  dias: DiaIso[];
}

/**
 * Compara, dia a dia e turno a turno, a demanda do posto com quem de
 * fato está alocado: o que faltou e o que sobrou. `cobertura` mapeia
 * `"chave|dia"` para quantas pessoas estão alocadas.
 */
export function conferirCobertura(
  dias: Dia[],
  turnos: TurnoDoPosto[],
  cobertura: Map<string, number>,
): { faltando: DiasPorTurno[]; sobrando: DiasPorTurno[]; totalFaltando: number; totalSobrando: number } {
  // Dois turnos com o mesmo horário contam como um só (somando a demanda).
  const porChave = new Map<string, { nome: string; demanda: number[] }>();
  for (const t of turnos) {
    const atual = porChave.get(t.chave) ?? { nome: t.nome, demanda: Array(7).fill(0) };
    t.demandaPorDiaDaSemana.forEach((q, i) => (atual.demanda[i] += q));
    porChave.set(t.chave, atual);
  }

  const faltando: DiasPorTurno[] = [];
  const sobrando: DiasPorTurno[] = [];
  let totalFaltando = 0;
  let totalSobrando = 0;

  for (const [chave, { nome, demanda }] of porChave) {
    const diasFaltando: DiaIso[] = [];
    const diasSobrando: DiaIso[] = [];
    for (const dia of dias) {
      if (dia.ehFeriadoMaster) continue; // posto fechado
      const pedido = demanda[dia.diaDaSemana] ?? 0;
      const alocado = cobertura.get(`${chave}|${dia.iso}`) ?? 0;
      if (alocado < pedido) {
        diasFaltando.push(dia.iso);
        totalFaltando += pedido - alocado;
      } else if (alocado > pedido) {
        diasSobrando.push(dia.iso);
        totalSobrando += alocado - pedido;
      }
    }
    if (diasFaltando.length > 0) faltando.push({ nome, dias: diasFaltando });
    if (diasSobrando.length > 0) sobrando.push({ nome, dias: diasSobrando });
  }

  return { faltando, sobrando, totalFaltando, totalSobrando };
}

// ------------------------------------------------------------
// Carga horária do CONTRATO de cada pessoa.
//
// Não é a RN04: a RN04 é o teto legal do sistema (ex.: 44h), e esse a
// geração respeita à risca. Aqui é a carga cadastrada no funcionário
// (ex.: 30h de meio período). Passar dela não bloqueia nada — pode ser
// hora extra combinada —, só AVISA, que foi o pedido do gestor.
// ------------------------------------------------------------

export interface HorasNoDia {
  pessoaId: number;
  diaIso: DiaIso;
  /** Horas efetivas do turno (já sem o intervalo intrajornada). */
  horas: number;
}

export interface PessoaComCarga {
  id: number;
  nome: string;
  cargaSemanal: number;
}

/** Segunda-feira da semana que contém o dia (a semana vai de seg a dom). */
export function segundaDaSemana(iso: DiaIso): DiaIso {
  return desloca(iso, -((diaDaSemanaDe(iso) + 6) % 7));
}

/**
 * Semanas do período em que a pessoa passou da carga do contrato.
 *
 * `alocacoes` deve trazer TUDO o que a pessoa trabalhou nessas semanas —
 * desta escala, de outras escalas e dos dias antes do período —, senão
 * uma semana que começa no mês anterior ou divide a pessoa entre dois
 * postos parece mais leve do que é.
 */
export function acimaDaCargaContratual(
  dias: Dia[],
  pessoas: PessoaComCarga[],
  alocacoes: HorasNoDia[],
): { id: number; nome: string; carga: number; semanas: { inicio: DiaIso; horas: number }[] }[] {
  const semanasDoPeriodo = new Set(dias.map((d) => segundaDaSemana(d.iso)));
  const horasPorChave = new Map<string, number>();
  for (const a of alocacoes) {
    const semana = segundaDaSemana(a.diaIso);
    if (!semanasDoPeriodo.has(semana)) continue;
    const chave = `${a.pessoaId}|${semana}`;
    horasPorChave.set(chave, (horasPorChave.get(chave) ?? 0) + a.horas);
  }

  const resultado: { id: number; nome: string; carga: number; semanas: { inicio: DiaIso; horas: number }[] }[] = [];
  for (const p of pessoas) {
    if (!(p.cargaSemanal > 0)) continue;
    const semanas = [...semanasDoPeriodo]
      .sort()
      .map((inicio) => ({
        inicio,
        // Arredonda a centésimos: 7.333… + 7.333… + … não pode virar
        // "30.000000004h" e disparar um aviso falso.
        horas: Math.round((horasPorChave.get(`${p.id}|${inicio}`) ?? 0) * 100) / 100,
      }))
      .filter((s) => s.horas > p.cargaSemanal);
    if (semanas.length > 0) {
      resultado.push({ id: p.id, nome: p.nome, carga: p.cargaSemanal, semanas });
    }
  }
  return resultado;
}

// ------------------------------------------------------------
// A mesma pessoa em OUTRA escala no período.
//
// A geração e a validação olham uma escala de cada vez. Quem é coringa
// sem posto, ou foi emprestado pela grade a outro posto, pode estar em
// duas escalas no mesmo mês — e as regras (dias seguidos, horas,
// descanso) não somam as duas. Por ora isto só AVISA, para o gestor
// conferir; não muda o que a geração decide.
// ------------------------------------------------------------

export interface DiaEmOutraEscala {
  pessoaId: number;
  diaIso: DiaIso;
  escalaId: number;
  /** Nome para a frase, ex.: "Loja Centro (Mercado Popular)". */
  posto: string;
}

export interface PessoaEmOutraEscala {
  id: number;
  nome: string;
  escalas: { escalaId: number; posto: string; dias: number; mesmoDia: DiaIso[] }[];
}

export function emOutraEscala<P extends { id: number; nome: string }>(
  pessoas: P[],
  /** Dias em que a pessoa trabalha NESTA escala, como "pessoaId|dia". */
  diasDestaEscala: Set<string>,
  outras: DiaEmOutraEscala[],
): PessoaEmOutraEscala[] {
  const porPessoa = new Map<number, Map<number, { posto: string; dias: Set<DiaIso> }>>();
  for (const o of outras) {
    const escalas =
      porPessoa.get(o.pessoaId) ?? new Map<number, { posto: string; dias: Set<DiaIso> }>();
    const atual = escalas.get(o.escalaId) ?? { posto: o.posto, dias: new Set<DiaIso>() };
    atual.dias.add(o.diaIso);
    escalas.set(o.escalaId, atual);
    porPessoa.set(o.pessoaId, escalas);
  }

  const resultado: PessoaEmOutraEscala[] = [];
  for (const p of pessoas) {
    const escalas = porPessoa.get(p.id);
    if (!escalas) continue;
    resultado.push({
      id: p.id,
      nome: p.nome,
      escalas: [...escalas].map(([escalaId, { posto, dias }]) => ({
        escalaId,
        posto,
        dias: dias.size,
        mesmoDia: [...dias].filter((d) => diasDestaEscala.has(`${p.id}|${d}`)).sort(),
      })),
    });
  }
  return resultado;
}
