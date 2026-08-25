import { apiGet } from "@/lib/api";
import { AusenciaForm } from "@/components/ausencia-form";

type Funcionario = { id: number; nome: string; coringa: boolean };
type Ausencia = {
  id: number;
  funcionarioId: number;
  dataInic: string;
  dataFim: string;
  motivo: string;
  compensacao: string | null;
};

export default async function EditarAusenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ausencia, funcionarios] = await Promise.all([
    apiGet<Ausencia>(`/ausencias/${id}`),
    apiGet<Funcionario[]>("/funcionarios"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Ausência
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <AusenciaForm
            id={ausencia.id}
            funcionarios={funcionarios}
            valoresIniciais={{
              funcionarioId: String(ausencia.funcionarioId),
              dataInicio: ausencia.dataInic,
              dataFim: ausencia.dataFim,
              motivo: ausencia.motivo,
              compensacao: ausencia.compensacao ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
