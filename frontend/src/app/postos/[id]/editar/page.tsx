import { apiGet } from "@/lib/api";
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
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Posto de Trabalho
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
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
