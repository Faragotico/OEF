import { apiGet } from "@/lib/api";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
};

export default async function RegrasPage() {
  const regras = await apiGet<Regra[]>("/regras");

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Regras
        </h1>

        <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-black/[.08] dark:border-white/[.145]"
                >
                  <td className="px-4 py-3">{r.descricao}</td>
                  <td className="px-4 py-3">{r.tipo}</td>
                  <td className="px-4 py-3">{r.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
