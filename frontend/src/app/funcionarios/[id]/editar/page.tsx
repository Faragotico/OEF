import { apiGet } from "@/lib/api";
import { EditarFuncionarioForm } from "@/components/editar-funcionario-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};
type Posto = { id: number; nome: string; localizacao: string };
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
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
  postoId: number | null;
};

export default async function EditarFuncionarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [funcionario, turnos, postos] = await Promise.all([
    apiGet<Funcionario>(`/funcionarios/${id}`),
    apiGet<Turno[]>("/turno"),
    apiGet<Posto[]>("/postos"),
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
            postos={postos}
            valoresIniciais={{
              nome: funcionario.nome,
              cpf: funcionario.cpf,
              telefone: funcionario.telefone ?? "",
              cargo: funcionario.cargo,
              cargaHorariaSemanal: funcionario.cargaHorariaSemanal,
              status: funcionario.status,
              postoId: funcionario.postoId ? String(funcionario.postoId) : "",
              turnoPadraoId: funcionario.turnoPadraoId
                ? String(funcionario.turnoPadraoId)
                : "",
              // "coringa" vem calculado pela API (sem turno de casa e
              // com habilitação), não é mais uma coluna do banco.
              coringa: funcionario.coringa,
              turnosHabilitadosIds: funcionario.turnosHabilitadosIds ?? [],
              diasSemanaVetados: funcionario.diasSemanaVetados ?? [],
            }}
          />
        </div>
      </div>
    </main>
  );
}
