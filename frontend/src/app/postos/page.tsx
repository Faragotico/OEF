import { apiGet } from "@/lib/api-server";
import { PostosList } from "@/components/postos-list";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};
type PostosPaginados = {
  data: Posto[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Filtros e página vêm da URL (?busca=centro&empresaId=3&page=2): cada
// mudança navega pra uma nova URL e só a página pedida sai do banco.
type SearchParams = { busca?: string; empresaId?: string; page?: string };

export default async function PostosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.empresaId) qs.set("empresaId", params.empresaId);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const [postos, empresas] = await Promise.all([
    apiGet<PostosPaginados>(`/postos${texto ? `?${texto}` : ""}`),
    apiGet<Empresa[]>("/empresas/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <PostosList
          postos={postos.data}
          total={postos.total}
          page={postos.page}
          totalPaginas={postos.totalPaginas}
          empresas={empresas}
          buscaAtual={params.busca ?? ""}
          empresaIdAtual={params.empresaId ?? ""}
        />
      </div>
    </main>
  );
}
