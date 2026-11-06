import { apiGet } from "@/lib/api-server";
import { CargosList, type Cargo } from "@/components/cargos-list";

// Lista de cargos (Porteiro, Recepcionista...). A busca vem da URL
// (?busca=port), como nas outras telas de cadastro. Sem paginação:
// são poucas linhas.
export default async function CargosPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const cargos = await apiGet<Cargo[]>(
    `/cargos${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`,
  );

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <CargosList cargos={cargos} buscaAtual={busca ?? ""} />
      </div>
    </main>
  );
}
