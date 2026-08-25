import Link from "next/link";
import { apiGet } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Ausencia = {
  id: number;
  dataInic: string;
  dataFim: string;
  motivo: string;
  compensacao: string | null;
  funcionario?: { nome: string };
};

export default async function AusenciasPage() {
  const ausencias = await apiGet<Ausencia[]>("/ausencias");
  const ausenciasOrdenadas = [...ausencias].sort((a, b) =>
    a.dataInic < b.dataInic ? 1 : -1,
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Ausências
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Faltas, atestados e licenças — a geração e a validação de
              escala nunca alocam alguém nesses períodos (RN02)
            </p>
          </div>
          <Link
            href="/ausencias/novo"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Nova Ausência
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Funcionário</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Compensação</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ausenciasOrdenadas.map((a) => (
                <tr
                  key={a.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{a.funcionario?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.dataInic} a {a.dataFim}
                  </td>
                  <td className="px-4 py-3">{a.motivo}</td>
                  <td className="px-4 py-3">{a.compensacao ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/ausencias/${a.id}/editar`}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        path={`/ausencias/${a.id}`}
                        confirmMessage={`Excluir a ausência de "${a.funcionario?.nome ?? "funcionário"}" (${a.dataInic} a ${a.dataFim})?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {ausenciasOrdenadas.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhuma ausência registrada.
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
