// Helper pra montar URLs da API do backend (NestJS).
// Usa NEXT_PUBLIC_API_URL do .env.local (default: http://localhost:3001).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Nome do cookie httpOnly que o backend grava no login. O JavaScript
// da página NÃO consegue lê-lo (é esse o ponto do httpOnly) — quem lê
// é o servidor do Next, em lib/api-server.ts e no middleware.
export const NOME_COOKIE_SESSAO = "oef_sessao";

/**
 * Erro de API com o status junto.
 *
 * O status importa: 401 significa "a sessão caiu", e quem chama precisa
 * conseguir distinguir isso de um 400 de validação sem ficar procurando
 * número dentro da mensagem de erro.
 */
export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ErroApi";
  }
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

/**
 * O fetch de verdade, com as duas coisas que a sessão exige:
 *
 *   - `credentials: "include"`, pra que o navegador mande o cookie de
 *     sessão junto. Frontend e backend estão em portas diferentes, e
 *     sem isso o fetch sai sem cookie nenhum. (Do lado do backend, o
 *     par disso é o `credentials: true` no CORS.)
 *   - `cabecalhos`, por onde o servidor do Next injeta o
 *     `Authorization: Bearer` — nas chamadas feitas no servidor não
 *     existe navegador pra mandar cookie sozinho.
 */
async function requisitar<T>(
  path: string,
  init: RequestInit,
  cabecalhos?: Record<string, string>,
  erroPadrao = "Erro ao chamar a API.",
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.headers ?? {}), ...(cabecalhos ?? {}) },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ErroApi(
      extractErrorMessage(data, `${erroPadrao} (${res.status} ${res.statusText})`),
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(
  path: string,
  cabecalhos?: Record<string, string>,
): Promise<T> {
  return requisitar<T>(
    path,
    { cache: "no-store" },
    cabecalhos,
    `Erro ao buscar ${path}.`,
  );
}

export function apiPost<T>(
  path: string,
  body: unknown,
  cabecalhos?: Record<string, string>,
): Promise<T> {
  return requisitar<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cabecalhos,
    "Erro ao enviar dados.",
  );
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  cabecalhos?: Record<string, string>,
): Promise<T> {
  return requisitar<T>(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cabecalhos,
    "Erro ao atualizar dados.",
  );
}

export function apiDelete<T>(
  path: string,
  cabecalhos?: Record<string, string>,
): Promise<T> {
  return requisitar<T>(
    path,
    { method: "DELETE" },
    cabecalhos,
    "Erro ao remover dados.",
  );
}
