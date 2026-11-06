import { apiGet } from "@/lib/api-server";
import { EditarFuncionarioForm } from "@/components/editar-funcionario-form";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};
type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresa?: { nome: string } | null;
};
type Funcionario = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargoId: number | null;
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
    apiGet<Turno[]>("/turnos/opcoes"),
    apiGet<Posto[]>("/postos/opcoes"),
  ]);

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-text">
          Editar Funcionário
        </h1>

        <div className="rounded-lg border border-border bg-card p-6">
          <EditarFuncionarioForm
            id={funcionario.id}
            turnos={turnos}
            postos={postos}
            valoresIniciais={{
              nome: funcionario.nome,
              cpf: funcionario.cpf,
              telefone: funcionario.telefone ?? "",
              cargoId: funcionario.cargoId ? String(funcionario.cargoId) : "",
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
