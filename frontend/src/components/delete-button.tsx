"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete } from "@/lib/api";

// Botão de excluir reaproveitado em toda tela de listagem (empresas,
// postos, turnos, regras, funcionários...). Confirma antes (ação
// irreversível), chama o DELETE certo e atualiza a lista.
export function DeleteButton({
  path,
  confirmMessage,
}: {
  path: string;
  confirmMessage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    setLoading(true);
    try {
      await apiDelete(path);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={loading}
        onClick={handleDelete}
        className="text-xs font-bold uppercase text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        {loading ? "Excluindo..." : "Excluir"}
      </button>
      {error && (
        <span className="mt-1 max-w-[16rem] text-xs font-medium text-red-700 dark:text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
