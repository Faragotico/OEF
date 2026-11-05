"use client";

// Botão que alterna entre Ativo e Inativo. Mostra o estado ATUAL e
// troca a cada clique — substitui o checkbox "Ativo" dos formulários de
// funcionário. O visual segue o das etiquetas de status da lista
// (verde = ativo, vermelho = inativo).
export function StatusToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (novo: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm text-text">
      <span>Status</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        title="Clique para alternar"
        className={
          value
            ? "self-start rounded-lg bg-success px-4 py-2 text-sm font-semibold uppercase text-white transition-opacity hover:opacity-90"
            : "self-start rounded-lg bg-danger px-4 py-2 text-sm font-semibold uppercase text-white transition-opacity hover:opacity-90"
        }
      >
        {value ? "Ativo" : "Inativo"}
      </button>
    </div>
  );
}
