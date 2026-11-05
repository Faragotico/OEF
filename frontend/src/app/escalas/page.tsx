import { apiGet, API_URL } from "@/lib/api-server";
import { mesAtual } from "@/lib/periodo";
import { EscalasList } from "@/components/escalas-list";

type Posto = { id: number; nome: string; localizacao: string };
type Escala = {
  id: number;
  dataInic: string;
  dataFim: string;
  posto?: { nome: string; localizacao: string };
  regra?: { descricao: string; valor: string };
};
type EscalasPaginadas = {
  data: Escala[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Filtros e página vêm da URL (?postoId=3&dataInicio=...&dataFim=...&page=2):
// cada mudança navega pra uma nova URL e só a página pedida sai do banco.
type SearchParams = {
  postoId?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: string;
};

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Período padrão = do começo do mês atual em diante (sem data final):
  // mostra o que está valendo e o que já foi gerado pra frente, e
  // esconde só o histórico antigo. (Um "só o mês atual" esconderia a
  // escala do mês que vem logo depois de gerada.) Só vale quando a URL
  // não fala de datas: se a pessoa limpou os campos, a URL traz
  // dataInicio= e dataFim= vazios (definidos, só sem valor) e aí
  // significa "todo o período".
  const urlTemPeriodo =
    params.dataInicio !== undefined || params.dataFim !== undefined;
  const dataInicio = urlTemPeriodo
    ? (params.dataInicio ?? "")
    : mesAtual().inicio;
  const dataFim = urlTemPeriodo ? (params.dataFim ?? "") : "";

  const qs = new URLSearchParams();
  if (params.postoId) qs.set("postoId", params.postoId);
  if (dataInicio) qs.set("dataInicio", dataInicio);
  if (dataFim) qs.set("dataFim", dataFim);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const [resultado, postos] = await Promise.all([
    apiGet<EscalasPaginadas>(`/escalas${texto ? `?${texto}` : ""}`),
    apiGet<Posto[]>("/postos/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <EscalasList
          escalas={resultado.data}
          total={resultado.total}
          page={resultado.page}
          totalPaginas={resultado.totalPaginas}
          postos={postos}
          postoIdAtual={params.postoId ?? ""}
          dataInicioAtual={dataInicio}
          dataFimAtual={dataFim}
          periodoPersonalizado={urlTemPeriodo}
          apiUrl={API_URL}
        />
      </div>
    </main>
  );
}
