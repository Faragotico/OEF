import Link from "next/link";

export default function EscalaNaoEncontrada() {
  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar para escalas
        </Link>

        <h1 className="text-2xl font-semibold text-text">
          Escala não encontrada
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Essa escala não existe ou já foi excluída. Volte pra lista de
          escalas pra ver as que ainda estão cadastradas.
        </p>
      </div>
    </main>
  );
}
