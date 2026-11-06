"use client";

import { useState } from "react";

// Campo de senha com o botão "Mostrar/Ocultar" dentro dele. Usado no
// login e no primeiro acesso.
//
// Mostrar a senha evita o "errei uma letra e não sei qual" — comum em
// quem digita devagar ou no notebook. O botão fica DENTRO do campo para
// não parecer um segundo campo.
export function CampoSenha({
  value,
  onChange,
  autoComplete,
  minLength,
  inputClassName,
}: {
  value: string;
  onChange: (valor: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  inputClassName: string;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        type={visivel ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClassName} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-pressed={visivel}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-md px-3 text-xs font-medium text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visivel && <path d="M3 3l18 18" />}
        </svg>
        {visivel ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
