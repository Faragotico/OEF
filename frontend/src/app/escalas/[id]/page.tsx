import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, API_URL } from "@/lib/api-server";
import { EscalaGrid } from "@/components/escala-grid";
import { ValidarEscalaButton } from "@/components/validar-escala-button";
import { rotuloEscala } from "@/lib/escala-rotulo";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type Escala = {
  id: number;
  dataInic: string;
  dataFim: string;
  postoId: number;
  posto?: { nome: string; localizacao: string };
  regra?: { descricao: string; valor: string };
};
type Funcionario = {
  id: number;
  nome: string;
  coringa: boolean;
  turnoPadrao: Turno | null;
  postoId: number | null;
  status: boolean;
};
type Alocacao = {
  id: number;
  data: string;
  funcionarioId: number;
  turnoId: number;
  escalaId: number;
};
type Regra = { id: number; descricao: string; tipo: string; valor: string };
type AlocacoesPaginadas = {
  data: Alocacao[];
  total: number;
  page: number;
  totalPaginas: number;
};

// /alocacoes sempre pagina (25/página); busca todas as páginas do filtro.
async function buscarTodasAlocacoesDaEscala(
  escalaId: number,
): Promise<Alocacao[]> {
  const todas: Alocacao[] = [];
  let page = 1;
  let totalPaginas = 1;
  do {
    const resposta = await apiGet<AlocacoesPaginadas>(
      `/alocacoes?escalaId=${escalaId}&page=${page}`,
    );
    todas.push(...resposta.data);
    totalPaginas = resposta.totalPaginas;
    page++;
  } while (page <= totalPaginas);
  return todas;
}

export default async function EscalaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Id inexistente (link velho, escala excluída) -> "não encontrada", não erro genérico.
  let escala: Escala;
  try {
    escala = await apiGet<Escala>(`/escalas/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    throw err;
  }

  const [funcionarios, turnos, regras, alocacoesDaEscala] = await Promise.all([
    apiGet<Funcionario[]>("/funcionarios"),
    // Só os turnos DESTE posto (antes vinha todo turno do sistema).
    apiGet<Turno[]>(`/turnos?postoId=${escala.postoId}`),
    apiGet<Regra[]>("/regras"),
    buscarTodasAlocacoesDaEscala(Number(id)),
  ]);

  // Pausa intrajornada (almoço etc.) — descontada das horas "no
  // período" mostradas na grade. Mesmo padrão do backend (1h) quando a
  // regra global não está cadastrada.
  const regraIntrajornada = regras.find(
    (r) => r.tipo === "intervalo_intrajornada",
  );
  const intervaloIntrajornadaHoras = regraIntrajornada
    ? Number(regraIntrajornada.valor)
    : 1;

  // Quem vira coluna: união de (1) equipe ativa do posto, tenha ou não
  // vaga na geração — sem isso quem saiu com zero alocações (voltou de
  // férias, foi barrado por regra) não tinha como ser incluído à mão —
  // e (2) quem já tem alocação aqui, mesmo se hoje é de outro posto
  // (senão a alocação dela sumiria da tela).
  const idsComAlocacao = new Set(
    alocacoesDaEscala.map((a) => a.funcionarioId),
  );
  const funcionariosDaEscala = funcionarios.filter(
    (f) =>
      (f.status && f.postoId === escala.postoId) || idsComAlocacao.has(f.id),
  );

  return (
    <main className="min-h-screen bg-background px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/escalas"
          className="mb-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar para escalas
        </Link>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              {rotuloEscala(escala)}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              escala #{escala.id}
              {escala.regra
                ? ` · regra ${escala.regra.descricao} (${escala.regra.valor})`
                : ""}
              {escala.posto?.localizacao ? ` · ${escala.posto.localizacao}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${API_URL}/escalas/${escala.id}/pdf`}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Gerar PDF ↓
            </a>
            <ValidarEscalaButton escalaId={escala.id} />
          </div>
        </div>

        {funcionariosDaEscala.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum funcionário para mostrar: esta escala não tem alocações
            e não há funcionário ativo vinculado a este posto. Vincule a
            equipe ao posto no cadastro de funcionários.
          </p>
        ) : (
          <EscalaGrid
            dataInicio={escala.dataInic}
            dataFim={escala.dataFim}
            funcionarios={funcionariosDaEscala}
            turnos={turnos}
            alocacoes={alocacoesDaEscala}
            escalaId={escala.id}
            intervaloIntrajornadaHoras={intervaloIntrajornadaHoras}
          />
        )}
      </div>
    </main>
  );
}
