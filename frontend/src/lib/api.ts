// Helper simples pra montar URLs da API do backend (NestJS).
// Usa NEXT_PUBLIC_API_URL do .env.local (default: http://localhost:3001).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Erro ao buscar ${path}: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Junta as mensagens de erro que o NestJS devolve quando o class-validator
// recusa o DTO (400, com `message` sendo um array de strings — uma por
// regra violada — ou às vezes uma string só).
function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      extractErrorMessage(data, `Erro ${res.status} ao enviar dados.`),
    );
  }

  return res.json();
}
