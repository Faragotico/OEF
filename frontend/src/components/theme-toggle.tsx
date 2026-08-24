"use client";

import { useEffect, useState } from "react";

// Botão que alterna a classe "dark" na tag <html> e salva a escolha
// no localStorage. O script inline no layout.tsx já aplica essa
// preferência antes da página pintar (evita flash de tema errado).
// Fica no header, que é sempre navy (cor da marca) — por isso usa
// tons de branco/transparência fixos, não dark:.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (isDark === null) {
    return <div className="h-9 w-[104px]" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className="flex h-9 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
    >
      {isDark ? "☀️ Claro" : "🌙 Escuro"}
    </button>
  );
}
