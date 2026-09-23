"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api";

// Sair = pedir ao backend que apague o cookie de sessão. O JavaScript
// daqui não consegue apagá-lo sozinho: ele é httpOnly, e é justamente
// por isso que um XSS não rouba a sessão.
export function SairButton() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await apiPost("/auth/logout", {});
    } catch {
      // Se o backend não responder, ainda assim mandamos o usuário para
      // o login — insistir num erro aqui só prende quem quer sair.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </svg>
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
