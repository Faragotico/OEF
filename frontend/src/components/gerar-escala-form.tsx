"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { EscalaGrid } from "@/components/escala-grid";

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

type ResultadoGeracao = {
  escala: {
    id: number;
    dataInic: string;
    dataFim: string;
    posto?: { nome: string };
    regra?: { descricao: string; valor: string };
  };
  alocacoesCriadas: Array<{
    id: number;
    data: string;
    funcionarioId: number;
    turnoId: number;
  }>;
  totalAlocacoesCriadas: number;
  resumoPorFuncionario: Array<{
    funcionarioId: number;
    nome: string;
    turnoPadraoId: number | null;
    coringa: boolean;
    diasTrabalhados: string[];
    folgas: Array<{ data: string; motivo: string }>;
    coberturas: Array<{
      data: string;
      turnoId: number;
      funcionarioCobertoId: number;
      funcionarioCobertoNome: string;
    }>;
  }>;
  funcionariosSemTurnoPadrao: Array<{ id: number; nome: string }>;
  avisoRodizio: string | null;
  coberturasPendentes: Array<{ data: string; funcionario: string; motivo: string }>;
};

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

function turnoLabel(t: Turno | null) {
  if (!t) return "sem turno padrão";
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

// Chip clicável no lugar do checkbox + label plano — o quadrado à
// esquerda funciona como "caixa marcada" (preenche e ganha check), e o
// chip inteiro "afunda" quando selecionado, no mesmo idioma visual do
// botão de submit (relevo que desaparece ao ser pressionado). Bem mais
// fácil de escanear numa lista longa do que uma coluna de checkboxes.
function FuncionarioChip({
  nome,
  subtitulo,
  selecionado,
  onToggle,
}: {
  nome: string;
  subtitulo: string;
  selecionado: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onToggle}
      className={
        "flex items-center gap-3 border-2 border-black px-3 py-2.5 text-left text-sm transition-all " +
        (selecionado
          ? "translate-x-[2px] translate-y-[2px] bg-red-600 text-white shadow-none"
          : "bg-white text-black shadow-[3px_3px_0_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:bg-red-50 hover:shadow-[4px_4px_0_0_#000] dark:bg-zinc-900 dark:text-white dark:hover:bg-red-950/20")
      }
    >
      <span
        className={
          "flex h-5 w-5 flex-none items-center justify-center border-2 text-xs font-black " +
          (selecionado
            ? "border-white bg-white text-red-600"
            : "border-black bg-white text-transparent dark:border-zinc-500 dark:bg-zinc-900")
        }
      >
        ✓
      </span>
      <span className="flex flex-col">
        <span className="font-bold">{nome}</span>
        <span
          className={
            "text-xs " +
            (selecionado ? "text-red-100" : "text-zinc-500 dark:text-zinc-400")
          }
        >
          {subtitulo}
        </span>
      </span>
    </button>
  );
}

export function GerarEscalaForm({
  postos,
  regras,
  funcionarios,
  turnos,
}: {
  postos: Posto[];
  regras: Regra[];
  funcionarios: Funcionario[];
  turnos: Turno[];
}) {
  const [postoId, setPostoId] = useState(postos[0]?.id ?? "");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [regraId, setRegraId] = useState<string>("");
  const [funcionarioIds, setFuncionarioIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoGeracao | null>(null);
  const [sugestaoAplicada, setSugestaoAplicada] = useState(false);

  // Ordenados por horário de início — com postos de vários horários
  // (ex: abertura/meio/fechamento) a lista fica bem mais fácil de ler
  // do que na ordem de cadastro.
  const titulares = funcionarios
    .filter((f) => f.status && !f.coringa && f.turnoPadrao)
    .sort((a, b) =>
      (a.turnoPadrao?.horaInicio ?? "").localeCompare(
        b.turnoPadrao?.horaInicio ?? "",
      ),
    );
  const coringas = funcionarios
    .filter((f) => f.status && f.coringa)
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const semTurno = funcionarios.filter(
    (f) => f.status && !f.coringa && !f.turnoPadrao,
  );

  // Sugestão automática: ao escolher um posto, busca a última escala já
  // gerada pra ele e pré-marca quem trabalhou nela — é a equipe mais
  // provável de novo (gerar escala é uma tarefa recorrente, mês a mês,
  // quase sempre com o mesmo pessoal). Também evita o erro de deixar
  // gente de outro posto marcada por engano: a seleção some ao trocar
  // de posto (ver onChange do select) e só volta se houver histórico
  // desse posto específico.
  useEffect(() => {
    let cancelado = false;
    setSugestaoAplicada(false);

    async function sugerirEquipeAnterior() {
      try {
        const escalas = await apiGet<{ id: number; postoId: number }[]>(
          "/escalas",
        );
        const ultima = escalas
          .filter((e) => e.postoId === Number(postoId))
          .sort((a, b) => b.id - a.id)[0];
        if (!ultima) return;

        const alocacoes = await apiGet<
          { escalaId: number; funcionarioId: number }[]
        >("/alocacoes");
        const idsUsados = Array.from(
          new Set(
            alocacoes
              .filter((a) => a.escalaId === ultima.id)
              .map((a) => a.funcionarioId),
          ),
        );
        if (!cancelado && idsUsados.length > 0) {
          setFuncionarioIds(idsUsados);
          setSugestaoAplicada(true);
        }
      } catch {
        // Sem sugestão (posto novo, ou API indisponível) — segue com a
        // seleção vazia, sem travar o formulário por isso.
      }
    }

    sugerirEquipeAnterior();
    return () => {
      cancelado = true;
    };
  }, [postoId]);

  // Precisa de pelo menos 1 titular MARCADO — deixar a lista vazia não
  // significa "todos os ativos", porque com vários postos cadastrados
  // isso mistura gente de postos diferentes na mesma escala (o rodízio
  // de folga passa a colidir entre eles). Cada geração exige escolher
  // explicitamente quem trabalha NESTE posto.
  const titularesMarcados = funcionarioIds.filter((id) =>
    titulares.some((f) => f.id === id),
  ).length;

  function alternarFuncionario(id: number) {
    setFuncionarioIds((atual) =>
      atual.includes(id) ? atual.filter((f) => f !== id) : [...atual, id],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResultado(null);
    setLoading(true);

    try {
      const resposta = await apiPost<ResultadoGeracao>(
        "/escalas/gerar-automatica",
        {
          postoId: Number(postoId),
          dataInicio,
          dataFim,
          regraId: regraId ? Number(regraId) : undefined,
          funcionarioIds: funcionarioIds.length ? funcionarioIds : undefined,
        },
      );
      setResultado(resposta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar escala.");
    } finally {
      setLoading(false);
    }
  }

  const folgaMotivos = resultado
    ? new Map(
        resultado.resumoPorFuncionario.flatMap((r) =>
          r.folgas.map((f) => [`${r.funcionarioId}|${f.data}`, f.motivo] as const),
        ),
      )
    : undefined;

  const funcionariosDaGrade = resultado
    ? resultado.resumoPorFuncionario.map((r) => ({
        id: r.funcionarioId,
        nome: r.nome,
        coringa: r.coringa,
        turnoPadrao:
          funcionarios.find((f) => f.id === r.funcionarioId)?.turnoPadrao ?? null,
      }))
    : [];

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Posto de trabalho
          <select
            required
            value={postoId}
            onChange={(e) => {
              // Troca de posto limpa a seleção de funcionários — do
              // contrário, quem ficou marcado pro posto anterior
              // continua marcado e mistura gente de postos diferentes
              // na mesma escala (foi exatamente o que gerou a escala
              // errada: Ana/Carla/Diego do Mercado Centro sobraram
              // marcados ao trocar pra Uvaranas).
              setPostoId(e.target.value);
              setFuncionarioIds([]);
            }}
            className={inputClass}
          >
            {postos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.localizacao}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
            Data início
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
            Data fim
            <input
              type="date"
              required
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Regra de escala (opcional)
          <select
            value={regraId}
            onChange={(e) => setRegraId(e.target.value)}
            className={inputClass}
          >
            <option value="">Usar a primeira regra "escala" cadastrada</option>
            {regras.map((r) => (
              <option key={r.id} value={r.id}>
                {r.descricao} ({r.valor})
              </option>
            ))}
          </select>
        </label>

        {sugestaoAplicada && (
          <p className="border-2 border-black bg-red-100 px-3 py-2 text-xs font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100">
            Pré-marcado com a equipe da última escala gerada pra este
            posto — confira e ajuste se precisar.
          </p>
        )}

        <fieldset className="flex flex-col gap-2 text-sm text-black dark:text-zinc-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="mb-0">
              Funcionários com turno fixo deste posto (marque pelo menos
              um — não marcar ninguém NÃO significa "todos", a geração
              fica bloqueada até você escolher)
            </legend>
            {titulares.length > 0 && (
              <span className="flex-none border-2 border-black bg-black px-2 py-0.5 text-xs font-bold text-white">
                {titularesMarcados}/{titulares.length} marcados
              </span>
            )}
          </div>
          {titulares.length > 0 && (
            <div className="-mt-1 mb-1 flex gap-3 text-xs font-bold uppercase text-red-700 dark:text-red-400">
              <button
                type="button"
                onClick={() =>
                  setFuncionarioIds((atual) =>
                    Array.from(
                      new Set([...atual, ...titulares.map((f) => f.id)]),
                    ),
                  )
                }
                className="hover:underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() =>
                  setFuncionarioIds((atual) =>
                    atual.filter((id) => !titulares.some((f) => f.id === id)),
                  )
                }
                className="hover:underline"
              >
                Desmarcar todos
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {titulares.map((f, i) => (
              <div
                key={f.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <FuncionarioChip
                  nome={f.nome}
                  subtitulo={turnoLabel(f.turnoPadrao)}
                  selecionado={funcionarioIds.includes(f.id)}
                  onToggle={() => alternarFuncionario(f.id)}
                />
              </div>
            ))}
          </div>

          {semTurno.length > 0 && (
            <p className="mt-2 border-2 border-black bg-red-200 px-3 py-2 text-xs font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
              {semTurno.length} funcionário(s) ativo(s) sem turno padrão
              definido não aparecem aqui:{" "}
              {semTurno.map((f) => f.nome).join(", ")}. Defina o turno
              padrão no cadastro deles (ou marque como coringa) pra
              incluí-los na geração automática.
            </p>
          )}
        </fieldset>

        {coringas.length > 0 && (
          <fieldset className="flex flex-col gap-2 text-sm text-black dark:text-zinc-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="mb-0">
                Coringas deste posto (cobrem a folga de quem tem turno
                fixo — opcional; nenhum marcado = sem cobertura de folga)
              </legend>
              <span className="flex-none border-2 border-black bg-black px-2 py-0.5 text-xs font-bold text-white">
                {
                  funcionarioIds.filter((id) => coringas.some((f) => f.id === id))
                    .length
                }
                /{coringas.length} marcados
              </span>
            </div>
            <div className="-mt-1 mb-1 flex gap-3 text-xs font-bold uppercase text-red-700 dark:text-red-400">
              <button
                type="button"
                onClick={() =>
                  setFuncionarioIds((atual) =>
                    Array.from(
                      new Set([...atual, ...coringas.map((f) => f.id)]),
                    ),
                  )
                }
                className="hover:underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() =>
                  setFuncionarioIds((atual) =>
                    atual.filter((id) => !coringas.some((f) => f.id === id)),
                  )
                }
                className="hover:underline"
              >
                Desmarcar todos
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {coringas.map((f, i) => (
                <div
                  key={f.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <FuncionarioChip
                    nome={f.nome}
                    subtitulo="coringa"
                    selecionado={funcionarioIds.includes(f.id)}
                    onToggle={() => alternarFuncionario(f.id)}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {titularesMarcados === 0 && titulares.length > 0 && (
          <p className="border-2 border-black bg-red-200 px-3 py-2 text-xs font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
            Marque pelo menos um funcionário com turno fixo pra habilitar a geração.
          </p>
        )}

        {error && (
          <p className="border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            postos.length === 0 ||
            titulares.length === 0 ||
            titularesMarcados === 0
          }
          className="mt-2 flex items-center justify-center gap-2 border-2 border-black bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading && <span className="spinner-square" aria-hidden />}
          {loading ? "Gerando..." : "Gerar escala"}
        </button>
      </form>

      {resultado && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap animate-fade-in-up items-center justify-between gap-2 border-2 border-black bg-red-100 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100">
            <span>
              Escala #{resultado.escala.id} gerada:{" "}
              {resultado.totalAlocacoesCriadas} alocações criadas para{" "}
              {resultado.resumoPorFuncionario.length} funcionário(s).
            </span>
            <Link
              href={`/escalas/${resultado.escala.id}`}
              className="border-2 border-black bg-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-900"
            >
              Abrir esta escala →
            </Link>
          </div>

          {resultado.funcionariosSemTurnoPadrao.length > 0 && (
            <div className="border-2 border-black bg-red-200 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
              Ficaram de fora por não terem turno padrão:{" "}
              {resultado.funcionariosSemTurnoPadrao
                .map((f) => f.nome)
                .join(", ")}
              .
            </div>
          )}

          {resultado.avisoRodizio && (
            <div className="border-2 border-black bg-red-200 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
              {resultado.avisoRodizio}
            </div>
          )}

          {resultado.coberturasPendentes.length > 0 && (
            <div className="border-2 border-black bg-red-200 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-900/40 dark:text-red-100">
              {resultado.coberturasPendentes.length} folga(s) ficaram sem
              cobertura de coringa:{" "}
              {resultado.coberturasPendentes
                .map((c) => `${c.funcionario} (${c.data})`)
                .join(", ")}
              .
            </div>
          )}

          <EscalaGrid
            dataInicio={dataInicio}
            dataFim={dataFim}
            funcionarios={funcionariosDaGrade}
            turnos={turnos}
            alocacoes={resultado.alocacoesCriadas}
            folgaMotivos={folgaMotivos}
            escalaId={resultado.escala.id}
          />
        </div>
      )}
    </div>
  );
}
