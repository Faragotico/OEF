"use client";

import { useMemo, useState } from "react";

type Funcionario = { id: number; nome: string; coringa: boolean };
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
  posto?: { nome: string };
};
type Alocacao = {
  id: number;
  data: string;
  ehSubstituido: boolean;
  funcionarioId: number;
  escalaId: number;
  turnoId: number;
};

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

function turnoLabel(t: Turno) {
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

function escalaLabel(e: Escala) {
  const posto = e.posto?.nome ?? `posto #${e.id}`;
  return `#${e.id} — ${posto} (${e.dataInic} a ${e.dataFim})`;
}

export function AlocacoesFilter({
  alocacoes,
  funcionarios,
  turnos,
  escalas,
}: {
  alocacoes: Alocacao[];
  funcionarios: Funcionario[];
  turnos: Turno[];
  escalas: Escala[];
}) {
  const [funcionarioId, setFuncionarioId] = useState("");
  const [turnoId, setTurnoId] = useState("");
  const [escalaId, setEscalaId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [substituido, setSubstituido] = useState("");
  const [pagina, setPagina] = useState(1);

  const POR_PAGINA = 25;

  const funcionarioById = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const turnoById = new Map(turnos.map((t) => [t.id, turnoLabel(t)]));
  const escalaById = new Map(escalas.map((e) => [e.id, e]));

  const filtradas = useMemo(() => {
    return alocacoes.filter((a) => {
      if (funcionarioId && a.funcionarioId !== Number(funcionarioId)) return false;
      if (turnoId && a.turnoId !== Number(turnoId)) return false;
      if (escalaId && a.escalaId !== Number(escalaId)) return false;
      if (dataInicio && a.data < dataInicio) return false;
      if (dataFim && a.data > dataFim) return false;
      if (substituido === "sim" && !a.ehSubstituido) return false;
      if (substituido === "nao" && a.ehSubstituido) return false;
      return true;
    });
  }, [alocacoes, funcionarioId, turnoId, escalaId, dataInicio, dataFim, substituido]);

  const filtrosAtivos =
    !!funcionarioId ||
    !!turnoId ||
    !!escalaId ||
    !!dataInicio ||
    !!dataFim ||
    !!substituido;

  function limparFiltros() {
    setFuncionarioId("");
    setTurnoId("");
    setEscalaId("");
    setDataInicio("");
    setDataFim("");
    setSubstituido("");
    setPagina(1);
  }

  // Muda o filtro, volta pra página 1 — senão dá pra ficar "perdido"
  // numa página que não existe mais depois de um filtro reduzir o total.
  function comReset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPagina(1);
    };
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const alocacoesDaPagina = filtradas.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Funcionário
          <select
            value={funcionarioId}
            onChange={(e) => comReset(setFuncionarioId)(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
                {f.coringa ? " (coringa)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Turno
          <select
            value={turnoId}
            onChange={(e) => comReset(setTurnoId)(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {turnoLabel(t)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Escala
          <select
            value={escalaId}
            onChange={(e) => comReset(setEscalaId)(e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {escalas.map((e) => (
              <option key={e.id} value={e.id}>
                {escalaLabel(e)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          De
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => comReset(setDataInicio)(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Até
          <input
            type="date"
            value={dataFim}
            onChange={(e) => comReset(setDataFim)(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Substituído?
          <select
            value={substituido}
            onChange={(e) => comReset(setSubstituido)(e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          {filtradas.length} de {alocacoes.length} alocações
          {filtradas.length > 0 &&
            ` · página ${paginaAtual} de ${totalPaginas}`}
        </span>
        {filtrosAtivos && (
          <button
            type="button"
            onClick={limparFiltros}
            className="border-2 border-black bg-white px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:bg-zinc-900 dark:text-white"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-red-100 dark:bg-red-950/40">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Turno</th>
              <th className="px-4 py-3 font-medium">Escala</th>
              <th className="px-4 py-3 font-medium">Substituído?</th>
            </tr>
          </thead>
          <tbody>
            {alocacoesDaPagina.map((a) => {
              const escala = escalaById.get(a.escalaId);
              return (
                <tr
                  key={a.id}
                  className="border-t-2 border-black transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <td className="px-4 py-3">{a.data}</td>
                  <td className="px-4 py-3">
                    {funcionarioById.get(a.funcionarioId) ?? a.funcionarioId}
                  </td>
                  <td className="px-4 py-3">
                    {turnoById.get(a.turnoId) ?? a.turnoId}
                  </td>
                  <td className="px-4 py-3">
                    {escala ? escalaLabel(escala) : `#${a.escalaId}`}
                  </td>
                  <td className="px-4 py-3">{a.ehSubstituido ? "Sim" : "Não"}</td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  Nenhuma alocação encontrada com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtradas.length > POR_PAGINA && (
        <div className="flex items-center justify-center gap-3 text-sm text-black dark:text-zinc-50">
          <button
            type="button"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            ← Anterior
          </button>
          <span>
            Página {paginaAtual} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
