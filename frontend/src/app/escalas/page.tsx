import Link from "next/link";
import { apiGet, API_URL } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Escala = {
  id: number;
  dataInic: string;
  dataFim: string;
  posto?: { nome: string; localizacao: string };
  regra?: { descricao: string; valor: string };
};

export default async function EscalasPage() {
  const escalas = await apiGet<Escala[]>("/escalas");
  const escalasOrdenadas = [...escalas].sort((a, b) =>
    a.dataInic < b.dataInic ? 1 : -1,
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Escalas
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cada escala gerada fica guardada aqui, separada por posto e período
            </p>
          </div>
          <Link
            href="/escalas/gerar"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Gerar escala
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Posto</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Regra</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {escalasOrdenadas.map((e) => (
                <tr
                  key={e.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">#{e.id}</td>
                  <td className="px-4 py-3">{e.posto?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    {e.dataInic} a {e.dataFim}
                  </td>
                  <td className="px-4 py-3">
                    {e.regra ? `${e.regra.descricao} (${e.regra.valor})` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`${API_URL}/escalas/${e.id}/pdf`}
                        className="font-bold text-black hover:underline dark:text-white"
                      >
                        PDF ↓
                      </a>
                      <Link
                        href={`/escalas/${e.id}`}
                        className="font-bold text-red-700 hover:underline dark:text-red-400"
                      >
                        Abrir →
                      </Link>
                      <DeleteButton
                        path={`/escalas/${e.id}`}
                        confirmMessage={`Excluir a escala #${e.id} (${e.posto?.nome ?? "posto"}, ${e.dataInic} a ${e.dataFim})? Isso apaga também todas as alocações geradas para ela — não dá pra desfazer. Use quando a geração saiu errada e você vai gerar de novo.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {escalasOrdenadas.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhuma escala gerada ainda.
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
