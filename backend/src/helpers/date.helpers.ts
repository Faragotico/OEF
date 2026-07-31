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