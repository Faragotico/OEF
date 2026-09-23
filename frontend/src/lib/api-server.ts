// Cliente de API pra Server Components — arquivo separado porque
// importa next/headers, que quebraria o bundle do navegador se
// morasse em lib/api.ts. Aqui o cookie é lido na mão e vira
// `Authorization: Bearer`; no navegador o próprio navegador já manda
// o cookie sozinho.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ErroApi,
  NOME_COOKIE_SESSAO,
  apiGet as apiGetBase,
} from "./api";

export { API_URL, ErroApi } from "./api";

async function cabecalhoSessao(): Promise<Record<string, string> | undefined> {
  const token = (await cookies()).get(NOME_COOKIE_SESSAO)?.value;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** GET autenticado para Server Components. 401 manda direto pro login em vez de estourar erro. */
export async function apiGet<T>(path: string): Promise<T> {
  try {
    return await apiGetBase<T>(path, await cabecalhoSessao());
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 401) {
      redirect("/login");
    }
    throw erro;
  }
}
