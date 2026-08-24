import { apiGet } from "@/lib/api";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
};

export default async function EmpresasPage() {
  const empresas = await apiGet<Empresa[]>("/empresas");

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Empresas
        </h1>

        <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Contato</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-black/[.08] dark:border-white/[.145]"
                >
                  <td className="px-4 py-3">{e.nome}</td>
                  <td className="px-4 py-3">{e.cnpj}</td>
                  <td className="px-4 py-3">{e.contato ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
