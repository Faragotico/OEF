import { apiGet } from "@/lib/api-server";
import { TurnosList } from "@/components/turnos-list";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
  posto?: { nome: string } | null;
  demandaPorDiaDaSemana: number[];
};
type Posto = { id: number; nome: string; localizacao: string };
type TurnosPaginados = {
  data: Turno[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Filtros e página vêm da URL (?busca=manha&postoId=3&page=2): cada
// mudança navega pra uma nova URL e só a página pedida sai do banco.
type SearchParams = { busca?: string; postoId?: string; page?: string };

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.postoId) qs.set("postoId", params.postoId);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const [turnos, postos] = await Promise.all([
    apiGet<TurnosPaginados>(`/turnos${texto ? `?${texto}` : ""}`),
    apiGet<Posto[]>("/postos/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <TurnosList
          turnos={turnos.data}
          total={turnos.total}
          page={turnos.page}
          totalPaginas={turnos.totalPaginas}
          postos={postos}
          buscaAtual={params.busca ?? ""}
          postoIdAtual={params.postoId ?? ""}
        />
      </div>
    </main>
  );
}
