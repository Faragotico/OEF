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
type AlocacoesPaginadas = {
  data: Alocacao[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Os filtros vêm da URL (?funcionarioId=3&page=2...), não de estado no
// navegador. Isso é o que permite o backend paginar de verdade: cada
// mudança de filtro navega pra uma nova URL, o Next busca de novo aqui
// (server component) e só a página pedida sai do banco — nunca a
// tabela inteira. Ver AlocacoesFilter pra como a navegação é disparada.
type SearchParams = {
  funcionarioId?: string;
  turnoId?: string;
  escalaId?: string;
  dataInicio?: string;
  dataFim?: string;
  substituido?: string;
  page?: string;
};

function paraQueryString(params: SearchParams): string {
  const qs = new URLSearchParams();
  if (params.funcionarioId) qs.set("funcionarioId", params.funcionarioId);
  if (params.turnoId) qs.set("turnoId", params.turnoId);
  if (params.escalaId) qs.set("escalaId", params.escalaId);
  if (params.dataInicio) qs.set("dataInicio", params.dataInicio);
  if (params.dataFim) qs.set("dataFim", params.dataFim);
  if (params.substituido) qs.set("substituido", params.substituido);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();
  return texto ? `?${texto}` : "";
}

export default async function AlocacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Funcionários/turnos/escalas continuam vindo por completo — são
  // listas limitadas (uma linha por cadastro, não por dia gerado), o
  // problema de escala era só a tabela de alocações.
  const [alocacoes, funcionarios, turnos, escalas] = await Promise.all([
    apiGet<AlocacoesPaginadas>(`/alocacoes${paraQueryString(params)}`),
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
            Use os filtros abaixo pra encontrar o que precisa — a lista
            não carrega tudo de uma vez, só a página filtrada.
          </p>
        </div>

        <AlocacoesFilter
          alocacoes={alocacoes.data}
          total={alocacoes.total}
          page={alocacoes.page}
          totalPaginas={alocacoes.totalPaginas}
          funcionarios={funcionarios}
          turnos={turnos}
          escalas={escalas}
          filtrosAtuais={params}
        />
      </div>
    </main>
  );
}
