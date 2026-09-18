// ============================================================
// periodo.ts — do cadastro do posto para a grade de vagas.
//
// Este arquivo responde a uma pergunta só: quais vagas existem entre
// duas datas? Ele é a fronteira entre "como a empresa descreve o posto"
// (turnos com demanda por dia da semana) e "o que o planejador resolve"
// (uma lista plana de vagas).
//
// É aqui que moram as duas features que o modelo anterior não sabia
// representar, e que agora são só dado:
//
//   - Turno-tampão: um turno que existe no posto sem ser o horário de
//     ninguém (um horário extra cobrindo o pico de demanda). Basta
//     cadastrar o turno com demanda; nenhum código precisa saber que
//     ele é "especial".
//   - Horário e demanda reduzidos em domingo/feriado: a demanda é POR
//     DIA DA SEMANA, então domingo pode pedir dois turnos onde a
//     segunda pede cinco. Como quem folga é o resíduo, reduzir a
//     demanda de domingo é o que faz mais gente ganhar domingo de
//     folga — sem nenhuma regra nova.
// ============================================================
import { feriadosMasterDoPeriodo } from '../../helpers/date.helpers';
import {
  type Dia,
  type DiaIso,
  type Vaga,
  desloca,
  diaDaSemanaDe,
  semanaIsoDe,
} from './modelo';

/**
 * Quanta gente esse turno precisa em cada dia da semana.
 * `porDiaDaSemana[0]` é domingo; 0 significa que o turno não abre.
 */
export interface DemandaTurno {
  turnoId: number;
  porDiaDaSemana: number[];
}

/** Demanda igual todo dia — o caso simples, e o padrão ao cadastrar. */
export const demandaUniforme = (turnoId: number, quantidade = 1): DemandaTurno => ({
  turnoId,
  porDiaDaSemana: Array(7).fill(quantidade),
});

export function montarDias(inicioIso: DiaIso, fimIso: DiaIso): Dia[] {
  const feriados = feriadosMasterDoPeriodo(
    new Date(`${inicioIso}T00:00:00Z`),
    new Date(`${fimIso}T00:00:00Z`),
  );
  const dias: Dia[] = [];
  for (let iso = inicioIso; iso <= fimIso; iso = desloca(iso, 1)) {
    dias.push({
      iso,
      diaDaSemana: diaDaSemanaDe(iso),
      ehFeriadoMaster: feriados.has(iso),
      semanaIso: semanaIsoDe(iso),
    });
  }
  return dias;
}

export function montarVagas(dias: Dia[], demandas: DemandaTurno[]): Vaga[] {
  const vagas: Vaga[] = [];
  for (const dia of dias) {
    if (dia.ehFeriadoMaster) continue; // posto fechado: sem vaga nenhuma
    for (const demanda of demandas) {
      const quantidade = demanda.porDiaDaSemana[dia.diaDaSemana] ?? 0;
      for (let indice = 0; indice < quantidade; indice++) {
        vagas.push({ diaIso: dia.iso, turnoId: demanda.turnoId, indice });
      }
    }
  }
  return vagas;
}

/**
 * Janela de histórico que o planejador precisa carregar do banco: os
 * dias imediatamente ANTES do período que ainda influenciam a primeira
 * semana. Sete dias cobrem o pior caso — a sequência de dias seguidos
 * (no máximo 6 pelo RN07) e a semana ISO que atravessa a virada.
 */
export const DIAS_DE_HISTORICO = 7;

export const inicioDoHistorico = (inicioIso: DiaIso): DiaIso =>
  desloca(inicioIso, -DIAS_DE_HISTORICO);
