import Link from "next/link";
import { apiGet } from "@/lib/api";
import { DeleteButton } from "@/components/delete-button";

type Funcionario = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  cargo: string;
  cargaHorariaSemanal: number;
  status: boolean;
  turnoPadrao?: {
    descricao: string | null;
    horaInicio: string;
    horaFim: string;
  } | null;
  coringa: boolean;
};

function turnoPadraoLabel(f: Funcionario) {
  if (!f.turnoPadrao) return "—";
  return f.turnoPadrao.descricao
    ? `${f.turnoPadrao.descricao} (${f.turnoPadrao.horaInicio}–${f.turnoPadrao.horaFim})`
    : `${f.turnoPadrao.horaInicio}–${f.turnoPadrao.horaFim}`;
}

export default async function FuncionariosPage() {
  const funcionarios = await apiGet<Funcionario[]>("/funcionarios");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Funcionários
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gerencie os funcionários e suas configurações de escala
            </p>
          </div>
          <Link
            href="/funcionarios/novo"
            className="border-2 border-black bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Novo Funcionário
          </Link>
        </div>

        <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-red-100 dark:bg-red-950/40">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Carga horária</th>
                <th className="px-4 py-3 font-medium">Turno padrão</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((f) => (
                <tr
                  key={f.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{f.nome}</td>
                  <td className="px-4 py-3">{f.cpf}</td>
                  <td className="px-4 py-3">{f.telefone}</td>
                  <td className="px-4 py-3">{f.cargo}</td>
                  <td className="px-4 py-3">{f.cargaHorariaSemanal}h</td>
                  <td className="px-4 py-3">
                    {f.coringa ? (
                      <span className="border-2 border-black bg-black px-2 py-1 text-xs font-bold uppercase text-white">
                        Coringa
                      </span>
                    ) : (
                      turnoPadraoLabel(f)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        f.status
                          ? "border-2 border-black bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white"
                          : "border-2 border-black bg-white px-2 py-1 text-xs font-bold uppercase text-black dark:bg-zinc-900 dark:text-white"
                      }
                    >
                      {f.status ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/funcionarios/${f.id}/editar`}
                        className="text-xs font-bold uppercase text-black hover:underline dark:text-white"
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        path={`/funcionarios/${f.id}`}
                        confirmMessage={`Excluir "${f.nome}"? Só funciona se não houver alocações vinculadas a ele.`}
                      />
                    </div>
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
