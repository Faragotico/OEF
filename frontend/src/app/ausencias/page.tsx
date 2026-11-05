import { apiGet } from "@/lib/api-server";
import { mesAtual } from "@/lib/periodo";
import { AusenciasList } from "@/components/ausencias-list";

type Funcionario = { id: number; nome: string; coringa: boolean };
type Ausencia = {
  id: number;
  funcionarioId: number;
  dataInic: string;
  dataFim: string;
  motivo: string;
  compensacao: string | null;
  funcionario?: { nome: string };
};
type AusenciasPaginadas = {
  data: Ausencia[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Filtros e página vêm da URL (?busca=maria&dataInicio=...&dataFim=...&page=2):
// cada mudança navega pra uma nova URL e só a página pedida sai do banco.
type SearchParams = {
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: string;
};

export default async function AusenciasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Período padrão = mês atual. Só vale quando a URL não fala de datas:
  // se a pessoa limpou os campos, a URL traz dataInicio= e dataFim=
  // vazios (definidos, só sem valor) e aí significa "todo o período".
  const urlTemPeriodo =
    params.dataInicio !== undefined || params.dataFim !== undefined;
  const padrao = mesAtual();
  const dataInicio = urlTemPeriodo ? (params.dataInicio ?? "") : padrao.inicio;
  const dataFim = urlTemPeriodo ? (params.dataFim ?? "") : padrao.fim;

  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (dataInicio) qs.set("dataInicio", dataInicio);
  if (dataFim) qs.set("dataFim", dataFim);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const [resultado, funcionarios] = await Promise.all([
    apiGet<AusenciasPaginadas>(`/ausencias${texto ? `?${texto}` : ""}`),
    apiGet<Funcionario[]>("/funcionarios/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <AusenciasList
          ausencias={resultado.data}
          total={resultado.total}
          page={resultado.page}
          totalPaginas={resultado.totalPaginas}
          funcionarios={funcionarios}
          buscaAtual={params.busca ?? ""}
          dataInicioAtual={dataInicio}
          dataFimAtual={dataFim}
          periodoPersonalizado={urlTemPeriodo}
        />
      </div>
    </main>
  );
}
