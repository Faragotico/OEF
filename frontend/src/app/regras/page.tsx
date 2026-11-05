import { apiGet } from "@/lib/api-server";
import { RegrasList } from "@/components/regras-list";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
  padrao: boolean;
};
type RegrasPaginadas = {
  data: Regra[];
  total: number;
  page: number;
  totalPaginas: number;
};

// Busca e página vêm da URL (?busca=5x1&page=2) e valem só pra tabela de
// padrões de rodízio — as configurações gerais (no máximo uma por tipo)
// e as regras antigas são poucas e vêm sempre completas.
type SearchParams = { busca?: string; page?: string };

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams({ tipo: "escala" });
  if (params.busca) qs.set("busca", params.busca);
  if (params.page) qs.set("page", params.page);

  const [padroes, todas] = await Promise.all([
    apiGet<RegrasPaginadas>(`/regras?${qs.toString()}`),
    apiGet<Regra[]>("/regras/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <RegrasList
          regras={todas}
          padroes={padroes.data}
          total={padroes.total}
          page={padroes.page}
          totalPaginas={padroes.totalPaginas}
          buscaAtual={params.busca ?? ""}
        />
      </div>
    </main>
  );
}
