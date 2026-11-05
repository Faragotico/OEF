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
import { type Dia, type DiaIso } from './modelo';

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
