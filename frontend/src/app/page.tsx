import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          OEF — Organizador de Escalas de Funcionários
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Frontend conectado ao backend NestJS. Primeira tela disponível:
        </p>
        <Link
          href="/funcionarios"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Ver Funcionários
        </Link>
      </main>
    </div>
  );
}
