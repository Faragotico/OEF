"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { EscalaGrid } from "@/components/escala-grid";
import {
  type Diagnostico,
  MOTIVO_FOLGA,
  RAZAO_VAGA_VAZIA,
  REGRA_CURTA,
  traduzir,
} from "@/lib/diagnosticos";

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

type ResultadoGeracao = {
  escala: { id: number; dataInic: string; dataFim: string } | null;
  simulacao: boolean;
  periodo: { inicio: string; fim: string };
  regra: { id: number; descricao: string; valor: string; ciclo: { trabalho: number; descanso: number } };
  turnos: Array<{
    id: number;
    descricao: string | null;
    horaInicio: string;
    horaFim: string;
    demandaPorDiaDaSemana: number[];
  }>;
  pessoas: Array<{ id: number; nome: string; coringa: boolean; turnoPadraoId: number | null }>;
  funcionariosSemTurno: Array<{ id: number; nome: string }>;
  feriadosNoPeriodo: string[];
  totalVagas: number;
  totalAlocacoes: number;
  alocacoes: Array<{
    id: number | null;
    data: string;
    funcionarioId: number;
    turnoId: number;
    foraDoPreferido: boolean;
  }>;
  folgas: Array<{ pessoaId: number; diaIso: string; motivo: string; regra?: string }>;
  vagasVazias: Array<{
    diaIso: string;
    turnoId: number;
    razao: string;
    bloqueios: Array<{ pessoaId: number; regra: string }>;
  }>;
  diagnosticos: Diagnostico[];
  reparosAplicados: number;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

function turnoLabel(t: { descricao: string | null; horaInicio: string; horaFim: string } | null) {
  if (!t) return "sem turno de casa";
  return t.descricao ? `${t.descricao} (${t.horaInicio}–${t.horaFim})` : `${t.horaInicio}–${t.horaFim}`;
}

// Linha de checklist: só o quadradinho indica seleção, sem caixa em
// volta de cada item — mais perto de uma lista de checkbox de editor de
// texto do que de um cartão clicável.
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
      className="flex items-center gap-3 rounded px-2 py-2 text-left text-sm transition-colors hover:bg-text/5"
    >
      <span
        className={
          "flex h-4 w-4 flex-none items-center justify-center rounded-sm border text-[10px] font-black transition-colors " +
          (selecionado
            ? "border-primary bg-primary text-white"
            : "border-zinc-400 bg-white text-transparent dark:border-zinc-600 dark:bg-zinc-900")
        }
      >
        ✓
      </span>
      <span className="flex flex-col">
        <span
          className={
            "font-medium " +
            (selecionado ? "text-primary" : "text-text")
          }
        >
          {nome}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitulo}</span>
      </span>
    </button>
  );
}

// Grade só de leitura para a SIMULAÇÃO.
//
// A EscalaGrid normal edita célula por célula, e pra isso precisa do id
// de cada alocação — que numa simulação não existe, porque nada foi
// salvo. Em vez de mostrar uma grade vazia ou de inventar ids falsos,
// a prévia tem a sua própria tabela: mesma leitura visual, sem clique.
function PreviaGrade({
  resultado,
}: {
  resultado: ResultadoGeracao;
}) {
  const dias: string[] = [];
  const cursor = new Date(`${resultado.periodo.inicio}T00:00:00Z`);
  const fim = new Date(`${resultado.periodo.fim}T00:00:00Z`);
  while (cursor <= fim) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const porPessoaDia = new Map(
    resultado.alocacoes.map((a) => [`${a.funcionarioId}|${a.data}`, a]),
  );
  const turnoPorId = new Map(resultado.turnos.map((t) => [t.id, t]));
  const vaziasPorDia = new Map<string, number>();
  for (const v of resultado.vagasVazias) {
    vaziasPorDia.set(v.diaIso, (vaziasPorDia.get(v.diaIso) ?? 0) + 1);
  }
  const feriados = new Set(resultado.feriadosNoPeriodo);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-[11px]">
        <thead className="border-b border-border bg-card">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Dia</th>
            {resultado.pessoas.map((p) => (
              <th key={p.id} className="px-2 py-1.5 font-bold">
                {p.nome}
                {p.coringa && <span className="block font-normal opacity-70">coringa</span>}
              </th>
            ))}
            <th className="px-2 py-1.5 font-bold">vazias</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((dia) => {
            const domingo = new Date(`${dia}T00:00:00Z`).getUTCDay() === 0;
            const vazias = vaziasPorDia.get(dia) ?? 0;
            return (
              <tr
                key={dia}
                className={
                  "border-t border-zinc-300 dark:border-zinc-700 " +
                  (domingo ? "bg-zinc-100 dark:bg-zinc-800/60" : "")
                }
              >
                <td className="whitespace-nowrap px-2 py-1 font-medium tabular-nums">
                  {dia.slice(8, 10)} {DIAS_SEMANA[new Date(`${dia}T00:00:00Z`).getUTCDay()]}
                </td>
                {resultado.pessoas.map((p) => {
                  const alocacao = porPessoaDia.get(`${p.id}|${dia}`);
                  const turno = alocacao ? turnoPorId.get(alocacao.turnoId) : null;
                  return (
                    <td
                      key={p.id}
                      className={
                        "px-2 py-1 text-center tabular-nums " +
                        (alocacao
                          ? alocacao.foraDoPreferido || p.coringa
                            ? "bg-substituicao-bg font-medium text-substituicao-text"
                            : ""
                          : "text-zinc-400 dark:text-zinc-600")
                      }
                    >
                      {alocacao && turno
                        ? `${turno.horaInicio}–${turno.horaFim}`
                        : feriados.has(dia)
                          ? "feriado"
                          : "folga"}
                    </td>
                  );
                })}
                <td
                  className={
                    "px-2 py-1 text-center font-bold tabular-nums " +
                    (vazias > 0 ? "bg-cobertura-bg text-cobertura-text" : "text-zinc-300 dark:text-zinc-700")
                  }
                >
                  {vazias || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Um diagnóstico por cartão, com a gravidade visível. Erro em vermelho
// forte, aviso em âmbar, informação em cinza — antes tudo saía no mesmo
// retângulo vermelho e o gestor não tinha como saber o que precisava de
// ação e o que era só nota de rodapé.
const ESTILO_NIVEL = {
  erro: "bg-danger text-white",
  aviso: "border border-warning/20 bg-warning/10 text-warning",
  info: "border border-border bg-text/5 text-text-secondary",
} as const;

function CartaoDiagnostico({ diagnostico }: { diagnostico: Diagnostico }) {
  const { nivel, titulo, detalhe, acao } = traduzir(diagnostico);
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${ESTILO_NIVEL[nivel]}`}>
      <p className="font-bold">{titulo}</p>
      <p className="mt-1 text-[13px] leading-snug opacity-90">{detalhe}</p>
      {acao && (
        <p className="mt-1.5 text-[13px] font-medium leading-snug">
          <span className="uppercase tracking-wide opacity-70">o que fazer: </span>
          {acao}
        </p>
      )}
    </div>
  );
}

export function GerarEscalaForm({
  postos,
  regras,
  funcionarios,
  turnos,
  intervaloIntrajornadaHoras = 1,
}: {
  postos: Posto[];
  regras: Regra[];
  funcionarios: Funcionario[];
  turnos: Turno[];
  intervaloIntrajornadaHoras?: number;
}) {
  // String, não number: é o valor de um <select>.
  const [postoId, setPostoId] = useState<string>(postos[0] ? String(postos[0].id) : "");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [regraId, setRegraId] = useState<string>("");
  const [funcionarioIds, setFuncionarioIds] = useState<number[]>([]);
  const [permitirForaDoPreferido, setPermitirForaDoPreferido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<"simular" | "gerar" | null>(null);
  const [resultado, setResultado] = useState<ResultadoGeracao | null>(null);

  const postoNumero = Number(postoId);

  // A grade de horários do posto: quais turnos ele abre e de quanta
  // gente precisa em cada dia. É o dado novo que faz a tela conseguir
  // responder "cabe?" ANTES de gerar.
  const turnosDoPosto = useMemo(
    () => turnos.filter((t) => t.postoId === postoNumero),
    [turnos, postoNumero],
  );

  const doPosto = (f: Funcionario) => f.postoId === postoNumero || f.postoId === null;

  const titulares = funcionarios
    .filter((f) => f.status && f.turnoPadrao && doPosto(f))
    .sort((a, b) => (a.turnoPadrao?.horaInicio ?? "").localeCompare(b.turnoPadrao?.horaInicio ?? ""));
  const coringas = funcionarios
    .filter((f) => f.status && f.coringa && doPosto(f))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const incompletos = funcionarios.filter((f) => f.status && f.cadastroIncompleto && doPosto(f));

  // Ao escolher o posto, já vem marcada a equipe vinculada a ele.
  useEffect(() => {
    const equipe = funcionarios.filter((f) => f.status && f.postoId === postoNumero);
    setFuncionarioIds(equipe.map((f) => f.id));
    setResultado(null);
  }, [postoNumero, funcionarios]);

  const marcados = funcionarioIds.filter((id) =>
    [...titulares, ...coringas].some((f) => f.id === id),
  ).length;

  // Quantas coberturas a grade pede por semana, contra quantas a equipe
  // marcada consegue entregar. Uma conta grosseira de propósito — o
  // número exato vem do motor —, mas suficiente pra avisar antes de
  // clicar em gerar, que é quando o aviso ainda é útil.
  const previaDeCapacidade = useMemo(() => {
    if (turnosDoPosto.length === 0 || marcados === 0) return null;
    const ciclo = regras.find((r) => String(r.id) === regraId) ?? regras.find((r) => r.tipo === "escala");
    const match = ciclo?.valor.match(/^(\d+)x(\d+)$/);
    if (!match) return null;
    const trabalho = Number(match[1]);
    const descanso = Number(match[2]);
    const vagasPorSemana = turnosDoPosto.reduce(
      (soma, t) => soma + t.demandaPorDiaDaSemana.reduce((a, b) => a + b, 0),
      0,
    );
    const capacidadePorSemana = (marcados * 7 * trabalho) / (trabalho + descanso);
    return { vagasPorSemana, capacidadePorSemana: Math.floor(capacidadePorSemana) };
  }, [turnosDoPosto, marcados, regraId, regras]);

  function alternarFuncionario(id: number) {
    setFuncionarioIds((atual) =>
      atual.includes(id) ? atual.filter((f) => f !== id) : [...atual, id],
    );
  }

  async function enviar(modo: "simular" | "gerar") {
    setError(null);
    setCarregando(modo);
    try {
      const resposta = await apiPost<ResultadoGeracao>(
        modo === "simular" ? "/escalas/simular" : "/escalas/gerar-automatica",
        {
          postoId: postoNumero,
          dataInicio,
          dataFim,
          regraId: regraId ? Number(regraId) : undefined,
          funcionarioIds: funcionarioIds.length ? funcionarioIds : undefined,
          permitirForaDoPreferido,
        },
      );
      setResultado(resposta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar escala.");
    } finally {
      setCarregando(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await enviar("gerar");
  }

  const podeEnviar =
    Boolean(dataInicio && dataFim) && turnosDoPosto.length > 0 && marcados > 0 && !carregando;

  // Folgas com motivo, indexadas pro tooltip da grade.
  const folgaMotivos = useMemo(() => {
    if (!resultado) return undefined;
    return new Map(
      resultado.folgas.map((f) => [
        `${f.pessoaId}|${f.diaIso}`,
        f.regra
          ? `${MOTIVO_FOLGA[f.motivo] ?? f.motivo} (${REGRA_CURTA[f.regra] ?? f.regra})`
          : (MOTIVO_FOLGA[f.motivo] ?? f.motivo),
      ]),
    );
  }, [resultado]);

  // Vagas vazias agrupadas por turno: "o turno 14–22 ficou vazio em 3
  // dias" é o que o gestor precisa saber. A versão anterior emendava
  // trinta "Fulano (2026-03-12)" numa frase só, que ninguém lia.
  const vaziasPorTurno = useMemo(() => {
    if (!resultado) return [];
    const mapa = new Map<number, string[]>();
    for (const v of resultado.vagasVazias) {
      mapa.set(v.turnoId, [...(mapa.get(v.turnoId) ?? []), v.diaIso]);
    }
    return [...mapa.entries()].map(([turnoId, dias]) => ({
      turno: resultado.turnos.find((t) => t.id === turnoId),
      dias,
      razoes: [
        ...new Set(
          resultado.vagasVazias.filter((v) => v.turnoId === turnoId).map((v) => v.razao),
        ),
      ],
    }));
  }, [resultado]);

  const funcionariosDaGrade = resultado
    ? resultado.pessoas.map((p) => ({
        id: p.id,
        nome: p.nome,
        coringa: p.coringa,
        turnoPadrao: funcionarios.find((f) => f.id === p.id)?.turnoPadrao ?? null,
      }))
    : [];

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text">
          Posto de trabalho
          <select
            required
            value={postoId}
            onChange={(e) => setPostoId(e.target.value)}
            className={inputClass}
          >
            {postos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {p.localizacao}
              </option>
            ))}
          </select>
        </label>

        {/* A grade de horários do posto, visível antes de gerar. É a
            mudança mais direta de quem entende a tela: a escala sai
            daqui, então isto precisa estar à vista. */}
        {turnosDoPosto.length > 0 ? (
          <div className="rounded-lg border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-wide">
              Grade de horários deste posto — em que dias cada turno existe
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-1.5 text-left font-medium">Turno</th>
                    {DIAS_SEMANA.map((d) => (
                      <th key={d} className="px-2 py-1.5 font-medium">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {turnosDoPosto.map((t) => (
                    <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-1.5 font-medium">{turnoLabel(t)}</td>
                      {t.demandaPorDiaDaSemana.map((q, i) => (
                        <td
                          key={i}
                          className={
                            "px-2 py-1.5 text-center " +
                            (q === 0 ? "text-zinc-300 dark:text-zinc-700" : "font-bold")
                          }
                        >
                          {q === 0 ? "—" : "existe"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-zinc-200 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Quem não ficar com nenhuma vaga no dia está de folga. Fechar um turno no
              domingo é o jeito mais direto de dar domingo de folga pra mais gente — edite
              na tela Turnos.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
            Este posto não tem turno cadastrado. A escala é gerada a partir da grade de
            horários do posto — cadastre os turnos na tela Turnos antes de gerar.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text">
            Data início
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text">
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

        <label className="flex flex-col gap-1 text-sm text-text">
          Padrão de rodízio
          <select value={regraId} onChange={(e) => setRegraId(e.target.value)} className={inputClass}>
            <option value="">Usar a primeira regra de rodízio cadastrada</option>
            {/* Só regras tipo "escala" fazem sentido aqui — as outras
                (carga horária semanal, intervalo entre jornadas) são
                globais e não se escolhem por geração. */}
            {regras
              .filter((r) => r.tipo === "escala")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.descricao} ({r.valor})
                </option>
              ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2 text-sm text-text">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="mb-0">Equipe deste posto</legend>
            <span className="flex-none rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
              {marcados}/{titulares.length + coringas.length} marcados
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {titulares.map((f) => (
              <FuncionarioChip
                key={f.id}
                nome={f.nome}
                subtitulo={
                  turnoLabel(f.turnoPadrao) +
                  (f.diasSemanaVetados.length
                    ? ` · nunca ${f.diasSemanaVetados.map((d) => DIAS_SEMANA[d]).join("/")}`
                    : "")
                }
                selecionado={funcionarioIds.includes(f.id)}
                onToggle={() => alternarFuncionario(f.id)}
              />
            ))}
            {coringas.map((f) => (
              <FuncionarioChip
                key={f.id}
                nome={f.nome}
                subtitulo={`coringa · cobre ${f.turnosHabilitadosIds.length} turno(s)`}
                selecionado={funcionarioIds.includes(f.id)}
                onToggle={() => alternarFuncionario(f.id)}
              />
            ))}
          </div>

          {incompletos.length > 0 && (
            <p className="mt-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              {incompletos.length} funcionário(s) com cadastro incompleto não aparecem
              aqui: {incompletos.map((f) => f.nome).join(", ")}. Defina o turno de casa
              deles, ou marque em quais turnos podem ser escalados.
            </p>
          )}
        </fieldset>

        <label className="flex items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={permitirForaDoPreferido}
            onChange={(e) => setPermitirForaDoPreferido(e.target.checked)}
            className="mt-1"
          />
          <span>
            Deixar um titular cobrir turno que não é o dele
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Desligado, cada pessoa fica no mesmo horário o mês inteiro (é o que as
              escalas reais mostram). Ligado, o motor tem muito mais saída — em especial
              pra dar domingo de folga pra todo mundo —, mas o horário de cada um varia.
            </span>
          </span>
        </label>

        {previaDeCapacidade && previaDeCapacidade.vagasPorSemana > previaDeCapacidade.capacidadePorSemana && (
          <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            A grade pede ~{previaDeCapacidade.vagasPorSemana} coberturas por semana e a
            equipe marcada dá conta de ~{previaDeCapacidade.capacidadePorSemana}. Algumas
            vagas vão ficar vazias — simule antes de gerar pra ver quais.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-3">
          {/* Simular vem ANTES de gerar, e de propósito: planejar deixou
              de custar caro, então experimentar virou o caminho normal.
              Antes só existia "gerar" — e pra testar outro rodízio você
              tinha que gerar, não gostar, apagar a escala e repetir. */}
          <button
            type="button"
            disabled={!podeEnviar}
            onClick={() => enviar("simular")}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-text/5 disabled:opacity-50"
          >
            {carregando === "simular" && <span className="spinner-square" aria-hidden />}
            {carregando === "simular" ? "Simulando..." : "Simular"}
          </button>
          <button
            type="submit"
            disabled={!podeEnviar}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {carregando === "gerar" && <span className="spinner-square" aria-hidden />}
            {carregando === "gerar" ? "Gerando..." : "Gerar e salvar"}
          </button>
        </div>
      </form>

      {resultado && (
        <div className="flex flex-col gap-4">
          <div
            className={
              "flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm font-medium " +
              (resultado.simulacao
                ? "border border-dashed border-border bg-text/5 text-text-secondary"
                : "border border-success/20 bg-success/10 text-success")
            }
          >
            <span>
              {resultado.simulacao ? (
                <>
                  <strong>Simulação</strong> — nada foi salvo.{" "}
                  {resultado.totalAlocacoes} de {resultado.totalVagas} vagas cobertas
                  {resultado.reparosAplicados > 0 &&
                    ` (${resultado.reparosAplicados} resolvidas por troca)`}
                  .
                </>
              ) : (
                <>
                  Escala #{resultado.escala?.id} gerada: {resultado.totalAlocacoes} de{" "}
                  {resultado.totalVagas} vagas cobertas para{" "}
                  {resultado.pessoas.length} funcionário(s).
                </>
              )}
            </span>
            {!resultado.simulacao && resultado.escala && (
              <Link
                href={`/escalas/${resultado.escala.id}`}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Abrir esta escala →
              </Link>
            )}
          </div>

          {resultado.diagnosticos
            .slice()
            .sort((a, b) => (a.nivel === "erro" ? -1 : b.nivel === "erro" ? 1 : 0))
            .map((d, i) => (
              <CartaoDiagnostico key={`${d.codigo}-${i}`} diagnostico={d} />
            ))}

          {vaziasPorTurno.length > 0 && (
            <div className="rounded-lg border border-border bg-cobertura-bg px-4 py-3 text-sm text-cobertura-text">
              <p className="font-bold">
                {resultado.vagasVazias.length} vaga(s) ficaram sem ninguém
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                {vaziasPorTurno.map(({ turno, dias, razoes }) => (
                  <li key={turno?.id ?? "?"}>
                    <span className="font-medium">
                      {turno ? turnoLabel(turno) : "turno desconhecido"}
                    </span>{" "}
                    — {dias.length} dia(s): {dias.join(", ")}
                    <span className="block opacity-80">
                      {razoes.map((r) => RAZAO_VAGA_VAZIA[r] ?? r).join("; ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado.funcionariosSemTurno.length > 0 && (
            <div className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
              Ficaram de fora por cadastro incompleto:{" "}
              {resultado.funcionariosSemTurno.map((f) => f.nome).join(", ")}.
            </div>
          )}

          {resultado.feriadosNoPeriodo.length > 0 && (
            <div className="rounded-lg border border-border bg-text/5 px-4 py-3 text-sm text-text-secondary">
              Feriado(s) no período (o posto não abre por padrão, e ninguém foi
              escalado): {resultado.feriadosNoPeriodo.join(", ")}. Edite a alocação
              manualmente se precisar manter cobertura em algum deles.
            </div>
          )}

          {/* Simulação usa a grade só de leitura (não há alocação salva
              pra editar); a escala gerada usa a grade normal, editável. */}
          {resultado.simulacao || !resultado.escala ? (
            <PreviaGrade resultado={resultado} />
          ) : (
            <EscalaGrid
              dataInicio={resultado.periodo.inicio}
              dataFim={resultado.periodo.fim}
              funcionarios={funcionariosDaGrade}
              turnos={resultado.turnos}
              alocacoes={resultado.alocacoes
                .filter((a): a is typeof a & { id: number } => a.id !== null)
                .map((a) => ({
                  id: a.id,
                  funcionarioId: a.funcionarioId,
                  data: a.data,
                  turnoId: a.turnoId,
                }))}
              folgaMotivos={folgaMotivos}
              escalaId={resultado.escala.id}
              intervaloIntrajornadaHoras={intervaloIntrajornadaHoras}
            />
          )}
        </div>
      )}
    </div>
  );
}
