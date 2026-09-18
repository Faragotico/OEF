import { apiGet } from "@/lib/api";
import { FuncionariosList } from "@/components/funcionarios-list";

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
  turnoPadrao?: {
    descricao: string | null;
    horaInicio: string;
    horaFim: string;
  } | null;
  coringa: boolean;
  cadastroIncompleto: boolean;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
  postoId: number | null;
  posto?: { nome: string } | null;
};

export default async function FuncionariosPage() {
  const [funcionarios, turnos, postos] = await Promise.all([
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
    apiGet<Posto[]>("/postos"),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-5xl">
        <FuncionariosList funcionarios={funcionarios} turnos={turnos} postos={postos} />
      </div>
    </main>
  );
}
