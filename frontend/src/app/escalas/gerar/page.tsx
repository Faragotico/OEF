import Link from "next/link";
import { apiGet } from "@/lib/api-server";
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
    apiGet<Posto[]>("/postos/opcoes"),
    apiGet<Regra[]>("/regras"),
    apiGet<Funcionario[]>("/funcionarios"),
    apiGet<Turno[]>("/turnos/opcoes"),
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
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar para escalas
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-text">
          Gerar Escala Automaticamente
        </h1>
        {/* A explicação mudou junto com o motor. Antes ela dizia "cada
            um com turno fixo é alocado no próprio horário, revezando a
            folga" — que descrevia o ALGORITMO. Agora descreve o que o
            gestor precisa entender pra usar a tela: o posto pede
            cobertura, o sistema decide quem cobre, e quem sobra folga. */}
        <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">Use <strong>Simular</strong> para ver o resultado sem salvar.</p>

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
