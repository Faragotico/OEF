import Link from "next/link";
import { apiGet } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};

export default async function PostosPage() {
  const [postos, empresas] = await Promise.all([
    apiGet<Posto[]>("/postos"),
    apiGet<Empresa[]>("/empresas"),
  ]);

  const empresaById = new Map(empresas.map((e) => [e.id, e.nome]));

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Postos de Trabalho
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Locais onde os funcionários são alocados
            </p>
          </div>
          <Link
            href="/postos/novo"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Novo Posto
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Localização</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {postos.map((p) => (
                <tr
                  key={p.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{p.nome}</td>
                  <td className="px-4 py-3">{p.localizacao}</td>
                  <td className="px-4 py-3">
                    {empresaById.get(p.empresaId) ?? p.empresaId}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/postos/${p.id}/editar`}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        path={`/postos/${p.id}`}
                        confirmMessage={`Excluir o posto "${p.nome}"? Só funciona se ele não tiver escalas vinculadas.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {postos.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    Nenhum posto cadastrado.
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
