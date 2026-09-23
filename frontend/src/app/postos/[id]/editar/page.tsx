import { apiGet } from "@/lib/api-server";
import { PostoForm } from "@/components/posto-form";

type Empresa = { id: number; nome: string };
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresaId: number;
};

export default async function EditarPostoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [posto, empresas] = await Promise.all([
    apiGet<Posto>(`/postos/${id}`),
    apiGet<Empresa[]>("/empresas"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Editar Posto de Trabalho
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <PostoForm
            id={posto.id}
            empresas={empresas}
            valoresIniciais={{
              nome: posto.nome,
              localizacao: posto.localizacao,
              empresaId: String(posto.empresaId),
            }}
          />
        </div>
      </div>
    </main>
  );
}
