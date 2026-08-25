import Link from "next/link";
import { apiGet, API_URL } from "@/lib/api";
import { EscalaGrid } from "@/components/escala-grid";
import { ValidarEscalaButton } from "@/components/validar-escala-button";

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
  posto?: { nome: string; localizacao: string };
  regra?: { descricao: string; valor: string };
};
type Funcionario = {
  id: number;
  nome: string;
  coringa: boolean;
  turnoPadrao: Turno | null;
};
type Alocacao = {
  id: number;
  data: string;
  funcionarioId: number;
  turnoId: number;
  escalaId: number;
};

export default async function EscalaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [escala, funcionarios, turnos, alocacoes] = await Promise.all([
    apiGet<Escala>(`/escalas/${id}`),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
    apiGet<Alocacao[]>("/alocacoes"),
  ]);

  const alocacoesDaEscala = alocacoes.filter(
    (a) => a.escalaId === escala.id,
  );

  const idsComAlocacao = new Set(
    alocacoesDaEscala.map((a) => a.funcionarioId),
  );
  const funcionariosDaEscala = funcionarios.filter((f) =>
    idsComAlocacao.has(f.id),
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-bold text-red-700 hover:underline dark:text-red-400"
        >
          ← Voltar para escalas
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Escala #{escala.id} — {escala.posto?.nome ?? "posto"}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {escala.dataInic} a {escala.dataFim}
              {escala.regra
                ? ` · regra ${escala.regra.descricao} (${escala.regra.valor})`
                : ""}
              {escala.posto?.localizacao ? ` · ${escala.posto.localizacao}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${API_URL}/escalas/${escala.id}/pdf`}
              className="border-2 border-black bg-black px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Gerar PDF ↓
            </a>
            <ValidarEscalaButton escalaId={escala.id} />
          </div>
        </div>

        {funcionariosDaEscala.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Esta escala ainda não tem alocações.
          </p>
        ) : (
          <EscalaGrid
            dataInicio={escala.dataInic}
            dataFim={escala.dataFim}
            funcionarios={funcionariosDaEscala}
            turnos={turnos}
            alocacoes={alocacoesDaEscala}
            escalaId={escala.id}
          />
        )}
      </div>
    </main>
  );
}
