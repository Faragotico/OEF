import { apiGet } from "@/lib/api";
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
    apiGet<Turno[]>("/turno"),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Novo Funcionário
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <NovoFuncionarioForm turnos={turnos} postos={postos} />
        </div>
      </div>
    </main>
  );
}
