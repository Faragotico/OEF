import { apiGet } from "@/lib/api-server";
import { NovoFuncionarioForm } from "@/components/novo-funcionario-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};
type Posto = { id: number; nome: string; localizacao: string };

// Server component só pra buscar turnos e postos (o form em si, que
// precisa de estado e eventos, mora no client component abaixo).
export default async function NovoFuncionarioPage() {
  const [turnos, postos] = await Promise.all([
    apiGet<Turno[]>("/turnos"),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Novo Funcionário
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <NovoFuncionarioForm turnos={turnos} postos={postos} />
        </div>
      </div>
    </main>
  );
}
