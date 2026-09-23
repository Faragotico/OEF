import { NextResponse, type NextRequest } from "next/server";

// Roda antes de toda página (Next 16 renomeou "middleware" -> "proxy").
// Só encaminha: sem sessão vai pro /login, com sessão não fica preso
// nele. NÃO confere assinatura do token — quem valida é o backend; um
// cookie forjado passa aqui mas cai em 401 na primeira chamada real.
const NOME_COOKIE_SESSAO = "oef_sessao";

export function proxy(req: NextRequest) {
  const temSessao = Boolean(req.cookies.get(NOME_COOKIE_SESSAO)?.value);
  const indoPraLogin = req.nextUrl.pathname === "/login";

  if (!temSessao && !indoPraLogin) {
    const destino = new URL("/login", req.url);
    // Guarda de onde a pessoa veio, para devolvê-la ao lugar certo
    // depois de entrar — quem clicou num link de escala espera voltar
    // para aquela escala, não para a tela inicial.
    if (req.nextUrl.pathname !== "/") {
      destino.searchParams.set("de", req.nextUrl.pathname);
    }
    return NextResponse.redirect(destino);
  }

  if (temSessao && indoPraLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Tudo passa por aqui, menos o que nunca depende de sessão:
// os arquivos internos do Next, os ícones e as imagens do /public.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$|site.webmanifest).*)",
  ],
};
