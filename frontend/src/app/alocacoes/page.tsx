import { apiGet } from "@/lib/api";

type Funcionario = { id: number; nome: string };
type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type Alocacao = {
  id: number;
  data: string;
  ehSubstituido: boolean;
  funcionarioId: number;
  escalaId: number;
  turnoId: number;
};

export default async function AlocacoesPage() {
  const [alocacoes, funcionarios, turnos] = await Promise.all([
    apiGet<Alocacao[]>("/alocacoes"),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
  ]);

  const funcionarioById = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const turnoById = new Map(
    turnos.map((t) => [t.id, t.descricao ?? `${t.horaInicio}–${t.horaFim}`]),
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Alocações
        </h1>

        <div className="overflow-x-auto rounded-lg border border-black/[.08] dark:border-white/[.145]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-black/[.03] dark:bg-white/[.05]">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Funcionário</th>
                <th className="px-4 py-3 font-medium">Turno</th>
                <th className="px-4 py-3 font-medium">Escala</th>
                <th className="px-4 py-3 font-medium">Substituído?</th>
              </tr>
            </thead>
            <tbody>
              {alocacoes.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-black/[.08] dark:border-white/[.145]"
                >
                  <td className="px-4 py-3">{a.data}</td>
                  <td className="px-4 py-3">
                    {funcionarioById.get(a.funcionarioId) ?? a.funcionarioId}
                  </td>
                  <td className="px-4 py-3">
                    {turnoById.get(a.turnoId) ?? a.turnoId}
                  </td>
                  <td className="px-4 py-3">#{a.escalaId}</td>
                  <td className="px-4 py-3">
                    {a.ehSubstituido ? "Sim" : "Não"}
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
