import { apiGet } from "@/lib/api-server";
import { EmpresasList } from "@/components/empresas-list";

type Empresa = {
  id: number;
  nome: string;
  cnpj: string;
  contato: string | null;
};
type EmpresasPaginadas = {
  data: Empresa[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Busca e página vêm da URL (?busca=mercantil&page=2), não de estado
// no navegador: cada mudança navega pra uma nova URL, o Next busca de
// novo aqui (server component) e só a página pedida sai do banco.
type SearchParams = { busca?: string; page?: string };

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.page) qs.set("page", params.page);
  const texto = qs.toString();

  const resultado = await apiGet<EmpresasPaginadas>(
    `/empresas${texto ? `?${texto}` : ""}`,
  );

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <EmpresasList
          empresas={resultado.data}
          total={resultado.total}
          page={resultado.page}
          totalPaginas={resultado.totalPaginas}
          buscaAtual={params.busca ?? ""}
        />
      </div>
    </main>
  );
}
