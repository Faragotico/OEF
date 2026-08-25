import { apiGet } from "@/lib/api";
import { AusenciaForm } from "@/components/ausencia-form";

type Funcionario = { id: number; nome: string; coringa: boolean };

export default async function NovaAusenciaPage() {
  const funcionarios = await apiGet<Funcionario[]>("/funcionarios");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Nova Ausência
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <AusenciaForm funcionarios={funcionarios} />
        </div>
      </div>
    </main>
  );
}
