import { apiGet } from "@/lib/api";

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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Postos de Trabalho
        </h1>

        <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Localização</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {postos.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-black/[.08] dark:border-white/[.145]"
                >
                  <td className="px-4 py-3">{p.nome}</td>
                  <td className="px-4 py-3">{p.localizacao}</td>
                  <td className="px-4 py-3">
                    {empresaById.get(p.empresaId) ?? p.empresaId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
