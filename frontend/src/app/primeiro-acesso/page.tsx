"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { apiGet, apiPost } from "@/lib/api";
import { CampoSenha } from "@/components/campo-senha";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// ============================================================
// Primeiro acesso: cria o primeiro gestor do sistema.
//
// Aparece uma vez só, logo depois de instalar (banco sem nenhum usuário):
// a tela de login manda para cá. Depois que existe um gestor, o backend
// passa a recusar este cadastro, e esta tela devolve para o login.
//
// Antes, o primeiro usuário só podia ser criado por um script no
// terminal — impossível no app instalado, sem Node na máquina.
// ============================================================
export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Já tem gestor? Esta tela não serve mais: vai para o login.
  useEffect(() => {
    apiGet<{ precisaPrimeiroAcesso: boolean }>("/auth/situacao")
      .then((s) => {
        if (!s.precisaPrimeiroAcesso) router.replace("/login");
      })
      .catch(() => {});
  }, [router]);

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setEnviando(true);
    try {
      await apiPost("/auth/primeiro-acesso", { nome: nome.trim(), email: email.trim(), senha });
      // O backend já devolve a sessão: entra direto, sem pedir login.
      // refresh pelo mesmo motivo da tela de login (o layout lê o cookie).
      router.push("/");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/android-chrome-192x192.png" alt="OEF" width={48} height={48} />
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-text">
              Bem-vindo ao OEF
            </h1>
            <p className="text-sm text-text-secondary">
              Crie o acesso do gestor. Ele será usado para entrar no sistema.
            </p>
          </div>
        </div>

        <form
          onSubmit={criar}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
        >
          <label className="flex flex-col gap-1 text-sm text-text">
            Nome
            <input
              required
              autoFocus
              minLength={3}
              maxLength={100}
              autoComplete="name"
              placeholder="Ex.: Maria Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            E-mail
            <input
              type="email"
              required
              maxLength={150}
              autoComplete="username"
              placeholder="nome@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            Senha <span className="text-xs text-text-secondary">(mínimo 8 caracteres)</span>
            <CampoSenha
              value={senha}
              onChange={setSenha}
              autoComplete="new-password"
              minLength={8}
              inputClassName={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            Repita a senha
            <CampoSenha
              value={confirmacao}
              onChange={setConfirmacao}
              autoComplete="new-password"
              minLength={8}
              inputClassName={inputClass}
            />
          </label>

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
            {enviando ? "Criando…" : "Criar acesso e entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Guarde o e-mail e a senha: não há recuperação de senha pela tela.
        </p>
      </div>
    </main>
  );
}
