import { apiGet } from "@/lib/api-server";
import { FuncionariosList } from "@/components/funcionarios-list";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};

type Posto = { id: number; nome: string; localizacao: string };

type Funcionario = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargo: { id: number; nome: string } | null;
  cargoId: number | null;
  cargaHorariaSemanal: number;
  status: boolean;
  turnoPadraoId: number | null;
  turnoPadrao?: {
    descricao: string | null;
    horaInicio: string;
    horaFim: string;
  } | null;
  coringa: boolean;
  cadastroIncompleto: boolean;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
  postoId: number | null;
  posto?: { nome: string } | null;
};

type FuncionariosPaginados = {
  data: Funcionario[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Filtros e página vêm da URL (?busca=maria&postoId=3&status=todos&page=2):
// cada mudança navega pra uma nova URL, o Next busca de novo aqui (server
// component) e só a página pedida sai do banco. Sem `status` na URL, o
// backend assume "ativo".
type SearchParams = {
  busca?: string;
  postoId?: string;
  status?: string;
  page?: string;
};

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.postoId) qs.set("postoId", params.postoId);
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const [resultado, turnos, postos] = await Promise.all([
    apiGet<FuncionariosPaginados>(`/funcionarios${texto ? `?${texto}` : ""}`),
    apiGet<Turno[]>("/turnos/opcoes"),
    apiGet<Posto[]>("/postos/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <FuncionariosList
          funcionarios={resultado.data}
          total={resultado.total}
          page={resultado.page}
          totalPaginas={resultado.totalPaginas}
          turnos={turnos}
          postos={postos}
          buscaAtual={params.busca ?? ""}
          postoIdAtual={params.postoId ?? ""}
          statusAtual={params.status ?? "ativo"}
        />
      </div>
    </main>
  );
}
