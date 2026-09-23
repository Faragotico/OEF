"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { apiPost } from "@/lib/api";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// ============================================================
// Tela de login.
//
// Client Component porque precisa de estado de formulário. Ela chama o
// backend direto (não uma rota do Next no meio): quem grava o cookie de
// sessão é a resposta do próprio backend, e `credentials: "include"`
// — que o lib/api.ts já manda em toda chamada — é o que autoriza o
// navegador a guardar esse cookie vindo de outra porta.
//
// Depois do sucesso, `router.refresh()` junto com o `push` não é
// enfeite: o layout raiz decide mostrar a barra lateral olhando o
// cookie, e sem o refresh o Next reaproveitaria a árvore de Server
// Components que ele renderizou quando ainda não havia sessão.
// ============================================================
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await apiPost("/auth/login", { email: email.trim(), senha });
      // O middleware guarda em ?de= a página que a pessoa tentou abrir
      // antes de ser mandada para cá. Lido aqui, no evento, em vez de
      // com useSearchParams — que exigiria envolver a página inteira
      // num <Suspense> só por causa disto.
      const de = new URLSearchParams(window.location.search).get("de");
      router.push(de && de.startsWith("/") && !de.startsWith("//") ? de : "/");
      router.refresh();
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Não foi possível entrar.",
      );
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/android-chrome-192x192.png"
            alt="OEF"
            width={48}
            height={48}
          />
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-text">
              OEF Sistema
            </h1>
            <p className="text-sm text-text-secondary">
              Gerenciamento de Escalas
            </p>
          </div>
        </div>

        <form
          onSubmit={entrar}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
        >
          <label className="flex flex-col gap-1 text-sm text-text">
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputClass}
            />
          </label>

          {/* role="alert" faz o leitor de tela anunciar o erro assim que
              ele aparece — sem isso, quem não enxerga a tela só descobre
              que o login falhou tentando de novo. */}
          {erro ? (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Acesso restrito ao gestor responsável pelas escalas.
        </p>
      </div>
    </main>
  );
}
