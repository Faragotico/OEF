import Link from "next/link";
import { apiGet } from "@/lib/api";
import { GerarEscalaForm } from "@/components/gerar-escala-form";

type Posto = { id: number; nome: string; localizacao: string };
type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
  demandaPorDiaDaSemana: number[];
};
type Regra = { id: number; descricao: string; tipo: string; valor: string };
type Funcionario = {
  id: number;
  nome: string;
  status: boolean;
  coringa: boolean;
  cadastroIncompleto: boolean;
  turnoPadrao: Turno | null;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
  postoId: number | null;
};

export default async function GerarEscalaPage() {
  const [postos, regras, funcionarios, turnos] = await Promise.all([
    apiGet<Posto[]>("/postos"),
    apiGet<Regra[]>("/regras"),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turno"),
  ]);

  const regrasEscala = regras.filter((r) => r.tipo === "escala");
  // Pausa intrajornada (almoço etc.) — descontada das horas "no
  // período" mostradas depois de gerar. Mesmo padrão do backend (1h)
  // quando a regra global não está cadastrada.
  const regraIntrajornada = regras.find((r) => r.tipo === "intervalo_intrajornada");
  const intervaloIntrajornadaHoras = regraIntrajornada
    ? Number(regraIntrajornada.valor)
    : 1;

  return (
    <main className="min-h-screen bg-zinc-50 px-8 py-8 dark:bg-black">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-bold text-red-700 hover:underline dark:text-red-400"
        >
          ← Voltar para escalas
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Gerar Escala Automaticamente
        </h1>
        {/* A explicação mudou junto com o motor. Antes ela dizia "cada
            um com turno fixo é alocado no próprio horário, revezando a
            folga" — que descrevia o ALGORITMO. Agora descreve o que o
            gestor precisa entender pra usar a tela: o posto pede
            cobertura, o sistema decide quem cobre, e quem sobra folga. */}
        <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cada posto tem uma grade de horários: quais turnos ele abre e de quanta gente
          precisa em cada dia da semana. O sistema preenche essa grade com a equipe,
          respeitando as regras trabalhistas (carga semanal, intervalo entre jornadas,
          dias seguidos, descanso semanal) — e quem não ficar com nenhuma vaga no dia
          está de folga. Use <strong>Simular</strong> pra ver o resultado sem salvar:
          dá pra comparar padrões de rodízio, ou ver o efeito de reduzir a demanda de
          domingo, antes de decidir.
        </p>

        <GerarEscalaForm
          postos={postos}
          regras={regrasEscala}
          funcionarios={funcionarios}
          turnos={turnos}
          intervaloIntrajornadaHoras={intervaloIntrajornadaHoras}
        />
      </div>
    </main>
  );
}
