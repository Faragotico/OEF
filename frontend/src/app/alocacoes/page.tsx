import { apiGet } from "@/lib/api";
import { AlocacoesFilter } from "@/components/alocacoes-filter";

type Funcionario = { id: number; nome: string; coringa: boolean };
type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type Escala = {
  id: number;
  dataInic: string;
  dataFim: string;
  posto?: { nome: string };
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
  const [alocacoes, funcionarios, turnos, escalas] = await Promise.all([
    apiGet<Alocacao[]>("/alocacoes"),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
    apiGet<Escala[]>("/escalas"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Alocações
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todas as alocações já geradas — use os filtros abaixo pra
            encontrar o que precisa
          </p>
        </div>

        <AlocacoesFilter
          alocacoes={alocacoes}
          funcionarios={funcionarios}
          turnos={turnos}
          escalas={escalas}
        />
      </div>
    </main>
  );
}
