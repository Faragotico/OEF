"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete } from "@/lib/api";
import { Modal } from "@/components/modal";

// Botão de excluir reaproveitado em toda tela de listagem (empresas,
// postos, turnos, regras, funcionários, ausências...). Confirma antes
// (ação irreversível) num popup no estilo do sistema — não o
// window.confirm() nativo do navegador, que sai do padrão visual e não
// tem como mostrar um erro de conflito (ex: "existem postos vinculados")
// direto na mesma caixa, só como alert() separado ou nada. Chama o
// DELETE certo e atualiza a lista.
export function DeleteButton({
  path,
  confirmMessage,
}: {
  path: string;
  confirmMessage: string;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await apiDelete(path);
      setConfirmando(false);
      router.refresh();
    } catch (err) {
      // Se o backend bloqueou por FK vinculada, vem uma mensagem clara
      // (409). Se vier "Internal Server Error" (500), é o backend
      // ainda não tendo esse caso tratado — mesmo assim mostramos aqui
      // dentro do popup, não deixamos a tela travar nem aparecer um
      // erro cru do navegador.
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmando(true);
        }}
        className="text-xs font-semibold uppercase text-danger hover:underline"
      >
        Excluir
      </button>

      {confirmando && (
        <Modal
          title="Confirmar exclusão"
          onClose={() => {
            if (!loading) setConfirmando(false);
          }}
        >
          <p className="text-sm text-text">{confirmMessage}</p>

          {error && (
            <p className="mt-4 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-90 disabled:opacity-50"
            >
              {loading ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
