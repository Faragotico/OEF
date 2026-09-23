import { cookies } from "next/headers";
import { NOME_COOKIE_SESSAO } from "./api";

/**
 * Existe sessão neste pedido?
 *
 * Só olha se o cookie ESTÁ LÁ — não confere a assinatura. É de
 * propósito: quem valida token é o backend, que tem o segredo. Aqui a
 * pergunta é só "mostro a barra lateral ou a tela de login?", e para
 * isso a presença basta. Um cookie forjado não abre nada: a primeira
 * chamada de dados volta 401 e o usuário cai no login.
 */
export async function temSessao(): Promise<boolean> {
  return Boolean((await cookies()).get(NOME_COOKIE_SESSAO)?.value);
}
