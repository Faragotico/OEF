// Converte um Date do Prisma em data pura ISO: "2026-08-01"
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Converte um Date do Prisma em hora pura: "06:00"
export function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

// Converte "06:00" no Date que o Prisma exige para campos @db.Time.
// O dia 1970-01-01 é só uma âncora — o banco guarda apenas a hora.
export function parseTime(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00Z`);
}

// ============================================================
// Helpers usados pelo motor de geração/validação de escala
// (RegrasTrabalhistasService e GeracaoEscalaService).
// ============================================================

// Normaliza uma data (string "AAAA-MM-DD" ou Date) pra meia-noite UTC,
// que é como o Prisma guarda e devolve campos @db.Date. Sem isso,
// comparar "a mesma data" vinda de fontes diferentes (corpo da
// requisição vs. banco) poderia falhar por causa de horário embutido.
export function normalizeDate(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Junta a DATA de um dia com a HORA de um turno (ambos em UTC), pra
// calcular intervalos entre um turno num dia e outro turno em outro dia
// (usado na regra RN05 — interjornada).
export function combineDateAndTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setUTCHours(
    time.getUTCHours(),
    time.getUTCMinutes(),
    time.getUTCSeconds(),
    0,
  );
  return combined;
}

// Duração de um turno em horas (ex: 06:00–14:00 = 8). O CreateTurnoDto
// já garante horaFim > horaInicio, então a conta nunca dá negativa —
// não existe turno que atravessa a meia-noite neste sistema.
export function shiftDurationHours(turno: {
  horaInicio: Date;
  horaFim: Date;
}): number {
  return (turno.horaFim.getTime() - turno.horaInicio.getTime()) / 3_600_000;
}

// Início (segunda-feira) da semana ISO que contém a data informada —
// mesma convenção do DATE_TRUNC('week', ...) do Postgres, usada pela
// RN04 pra somar a carga horária semanal.
export function startOfIsoWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay(); // 0 = domingo, 1 = segunda, ... 6 = sábado
  const diff = day === 0 ? 6 : day - 1; // quantos dias voltar até a segunda
  result.setUTCDate(result.getUTCDate() - diff);
  return result;
}

// Extrai o número de dias trabalhados de uma regra no formato "NxM"
// (ex: "5x1" -> 5). Se o valor não seguir esse formato, retorna
// undefined e quem chamar decide o padrão (a RN06 usa 5 como fallback).
export function parseEscalaLimit(valor?: string | null): number | undefined {
  const match = valor?.match(/^(\d+)x\d+$/);
  return match ? Number(match[1]) : undefined;
}

// Extrai os dois números do formato "NxM" (ex: "5x1" -> {trabalho: 5,
// descanso: 1}). Usado pelo GeracaoEscalaService pra escalonar a folga
// de cada funcionário do posto num rodízio: se cada um começa o ciclo
// num dia diferente, as folgas caem em dias diferentes — não duas
// pessoas do mesmo posto folgando no mesmo dia, igual às escalas reais.
export function parseEscalaCiclo(
  valor?: string | null,
): { trabalho: number; descanso: number } {
  const match = valor?.match(/^(\d+)x(\d+)$/);
  if (!match) return { trabalho: 5, descanso: 1 };
  return { trabalho: Number(match[1]), descanso: Number(match[2]) };
}

// Todas as datas entre início e fim (inclusive), um Date por dia —
// usada pra montar o eixo de linhas da grade/PDF da escala (UC08),
// no mesmo espírito do "diasDoPeriodo" que já existia no frontend.
export function diasDoPeriodo(dataInicio: Date, dataFim: Date): Date[] {
  const dias: Date[] = [];
  const cursor = normalizeDate(dataInicio);
  const fim = normalizeDate(dataFim);
  while (cursor <= fim) {
    dias.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}
