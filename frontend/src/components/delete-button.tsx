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
        className="text-xs font-bold uppercase text-red-700 hover:underline dark:text-red-400"
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
          <p className="text-sm text-black dark:text-zinc-50">{confirmMessage}</p>

          {error && (
            <p className="mt-4 border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setConfirmando(false)}
              className="border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition-all hover:bg-zinc-100 active:translate-x-[2px] active:translate-y-[2px] dark:bg-zinc-900 dark:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="border-2 border-black bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {loading ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
