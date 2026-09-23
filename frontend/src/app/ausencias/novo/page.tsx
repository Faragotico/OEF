import { apiGet } from "@/lib/api-server";
import { AusenciaForm } from "@/components/ausencia-form";

type Funcionario = { id: number; nome: string; coringa: boolean };

export default async function NovaAusenciaPage() {
  const funcionarios = await apiGet<Funcionario[]>("/funcionarios");

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Nova Ausência
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <AusenciaForm funcionarios={funcionarios} />
        </div>
      </div>
    </main>
  );
}
