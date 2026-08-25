import Link from "next/link";
import { apiGet } from "@/lib/api";
import { GerarEscalaForm } from "@/components/gerar-escala-form";

type Posto = { id: number; nome: string; localizacao: string };
type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type Regra = { id: number; descricao: string; tipo: string; valor: string };
type Funcionario = {
  id: number;
  nome: string;
  status: boolean;
  coringa: boolean;
  turnoPadrao: Turno | null;
};

export default async function GerarEscalaPage() {
  const [postos, regras, funcionarios, turnos] = await Promise.all([
    apiGet<Posto[]>("/postos"),
    apiGet<Regra[]>("/regras"),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
  ]);

  const regrasEscala = regras.filter((r) => r.tipo === "escala");

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-bold text-red-700 hover:underline dark:text-red-400"
        >
          ← Voltar para escalas
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Gerar Escala Automaticamente
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Escolhe o posto, o período e os funcionários — cada um com
          turno fixo é alocado no PRÓPRIO horário, revezando a folga
          com os demais do posto, respeitando as regras trabalhistas
          (carga horária, interjornada, 5x1, DSR). Coringas cobrem
          quem estiver de folga no dia, sem horário fixo. Importante:
          marque só os funcionários que trabalham NESTE posto — a
          lista mostra todo mundo cadastrado no sistema, então se
          você marcar gente de outro posto o rodízio de folga se
          confunde entre eles.
        </p>

        <GerarEscalaForm
          postos={postos}
          regras={regrasEscala}
          funcionarios={funcionarios}
          turnos={turnos}
        />
      </div>
    </main>
  );
}
