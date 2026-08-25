import { apiGet } from "@/lib/api";
import { RegraForm } from "@/components/regra-form";

type Regra = {
  id: number;
  descricao: string;
  tipo: string;
  valor: string;
};

export default async function EditarRegraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regra = await apiGet<Regra>(`/regras/${id}`);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Regra
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <RegraForm
            id={regra.id}
            valoresIniciais={{
              descricao: regra.descricao,
              tipo: regra.tipo,
              valor: regra.valor,
            }}
          />
        </div>
      </div>
    </main>
  );
}
