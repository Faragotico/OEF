"use client";

// Botões "Anterior / Próxima" reutilizáveis nas listas paginadas.
// Não busca nada: só avisa a lista (onChange) qual página foi pedida,
// e a lista navega pra nova URL (?page=N).
export function Paginacao({
  page,
  totalPaginas,
  onChange,
}: {
  page: number;
  totalPaginas: number;
  onChange: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm text-text">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-text/5 disabled:opacity-40 disabled:hover:bg-card"
      >
        ← Anterior
      </button>
      <span>
        Página {page} de {totalPaginas}
      </span>
      <button
        type="button"
        disabled={page >= totalPaginas}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-text/5 disabled:opacity-40 disabled:hover:bg-card"
      >
        Próxima →
      </button>
    </div>
  );
}
