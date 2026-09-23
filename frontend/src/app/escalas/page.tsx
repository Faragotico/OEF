import Link from "next/link";
import { apiGet, API_URL } from "@/lib/api-server";
import { DeleteButton } from "@/components/delete-button";
import { rotuloEscala } from "@/lib/escala-rotulo";

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
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              Escalas
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cada escala gerada fica guardada aqui, separada por posto e período
            </p>
          </div>
          <Link
            href="/escalas/gerar"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Gerar escala
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-card">
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
                  className="border-t border-border transition-colors hover:bg-text/5"
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
                        className="font-bold text-primary hover:underline"
                      >
                        PDF ↓
                      </a>
                      <Link
                        href={`/escalas/${e.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        Abrir →
                      </Link>
                      <DeleteButton
                        path={`/escalas/${e.id}`}
                        confirmMessage={`Excluir a escala "${rotuloEscala(e)}"? Isso apaga também todas as alocações geradas para ela — não dá pra desfazer. Use quando a geração saiu errada e você vai gerar de novo.`}
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
