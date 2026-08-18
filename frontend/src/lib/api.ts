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
