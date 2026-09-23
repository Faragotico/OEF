import { apiGet } from "@/lib/api-server";
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
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Editar Ausência
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
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
