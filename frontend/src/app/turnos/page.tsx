import Link from "next/link";
import { apiGet } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};

export default async function TurnosPage() {
  // Rota no backend é singular: /turno (as demais são plural).
  const turnos = await apiGet<Turno[]>("/turno");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Turnos
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Períodos de trabalho disponíveis no sistema
            </p>
          </div>
          <Link
            href="/turnos/novo"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Novo Turno
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Fim</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr
                  key={t.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{t.descricao ?? "—"}</td>
                  <td className="px-4 py-3">{t.horaInicio}</td>
                  <td className="px-4 py-3">{t.horaFim}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/turnos/${t.id}/editar`}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        path={`/turno/${t.id}`}
                        confirmMessage="Excluir este turno? Só funciona se não houver alocações vinculadas a ele."
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {turnos.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhum turno cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
