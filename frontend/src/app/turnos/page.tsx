import { apiGet } from "@/lib/api";

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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Turnos
        </h1>

        <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Fim</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-black/[.08] dark:border-white/[.145]"
                >
                  <td className="px-4 py-3">{t.descricao ?? "—"}</td>
                  <td className="px-4 py-3">{t.horaInicio}</td>
                  <td className="px-4 py-3">{t.horaFim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
