import { apiGet } from "@/lib/api-server";
import { AusenciasList } from "@/components/ausencias-list";

type Funcionario = { id: number; nome: string; coringa: boolean };
type Ausencia = {
  id: number;
  funcionarioId: number;
  dataInic: string;
  dataFim: string;
  motivo: string;
  compensacao: string | null;
  funcionario?: { nome: string };
};

export default async function AusenciasPage() {
  const [ausencias, funcionarios] = await Promise.all([
    apiGet<Ausencia[]>("/ausencias"),
    apiGet<Funcionario[]>("/funcionarios"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <AusenciasList ausencias={ausencias} funcionarios={funcionarios} />
      </div>
    </main>
  );
}
