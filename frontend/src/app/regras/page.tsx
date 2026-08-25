import Link from "next/link";
import { apiGet } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
};

export default async function RegrasPage() {
  const regras = await apiGet<Regra[]>("/regras");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Regras Trabalhistas
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Regras da CLT aplicadas na geração automática de escalas
            </p>
          </div>
          <Link
            href="/regras/novo"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Nova Regra
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr
                  key={r.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{r.descricao}</td>
                  <td className="px-4 py-3">{r.tipo}</td>
                  <td className="px-4 py-3">{r.valor}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/regras/${r.id}/editar`}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        path={`/regras/${r.id}`}
                        confirmMessage="Excluir esta regra? Só funciona se não houver escalas vinculadas a ela."
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {regras.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhuma regra cadastrada.
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
