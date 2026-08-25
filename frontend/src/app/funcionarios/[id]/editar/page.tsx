import { apiGet } from "@/lib/api";
import { EditarFuncionarioForm } from "@/components/editar-funcionario-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type Funcionario = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargo: string;
  cargaHorariaSemanal: number;
  status: boolean;
  turnoPadraoId: number | null;
  coringa: boolean;
};

export default async function EditarFuncionarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [funcionario, turnos] = await Promise.all([
    apiGet<Funcionario>(`/funcionarios/${id}`),
    apiGet<Turno[]>("/turno"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Editar Funcionário
        </h1>

        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
          <EditarFuncionarioForm
            id={funcionario.id}
            turnos={turnos}
            valoresIniciais={{
              nome: funcionario.nome,
              cpf: funcionario.cpf,
              telefone: funcionario.telefone ?? "",
              cargo: funcionario.cargo,
              cargaHorariaSemanal: funcionario.cargaHorariaSemanal,
              status: funcionario.status,
              turnoPadraoId: funcionario.turnoPadraoId
                ? String(funcionario.turnoPadraoId)
                : "",
              coringa: funcionario.coringa,
            }}
          />
        </div>
      </div>
    </main>
  );
}
