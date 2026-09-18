"use client";

import { usePathname, useRouter } from "next/navigation";

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
type FiltrosAtuais = {
  funcionarioId?: string;
  turnoId?: string;
  escalaId?: string;
  dataInicio?: string;
  dataFim?: string;
  substituido?: string;
  page?: string;
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

// Antes este componente recebia a tabela INTEIRA de alocações e
// filtrava/paginava no navegador (useMemo + slice sobre um array que
// só cresce). Agora ele só recebe a PÁGINA já filtrada que o backend
// devolveu (ver app/alocacoes/page.tsx) — este componente não filtra
// nada, só mostra o que veio e navega pra uma nova URL quando o
// usuário muda um filtro, o que faz o server component buscar de novo
// com os parâmetros certos.
export function AlocacoesFilter({
  alocacoes,
  total,
  page,
  totalPaginas,
  funcionarios,
  turnos,
  escalas,
  filtrosAtuais,
}: {
  alocacoes: Alocacao[];
  total: number;
  page: number;
  totalPaginas: number;
  funcionarios: Funcionario[];
  turnos: Turno[];
  escalas: Escala[];
  filtrosAtuais: FiltrosAtuais;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const funcionarioById = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const turnoById = new Map(turnos.map((t) => [t.id, turnoLabel(t)]));
  const escalaById = new Map(escalas.map((e) => [e.id, e]));

  const filtrosAtivos =
    !!filtrosAtuais.funcionarioId ||
    !!filtrosAtuais.turnoId ||
    !!filtrosAtuais.escalaId ||
    !!filtrosAtuais.dataInicio ||
    !!filtrosAtuais.dataFim ||
    !!filtrosAtuais.substituido;

  // Troca um filtro e navega. Sempre volta pra página 1 — senão dá pra
  // ficar "perdido" numa página que não existe mais depois que um
  // filtro reduz o total.
  function navegarComFiltro(chave: keyof FiltrosAtuais, valor: string) {
    const proximos: FiltrosAtuais = { ...filtrosAtuais, [chave]: valor || undefined };
    delete proximos.page;
    navegar(proximos);
  }

  function navegarComPagina(novaPagina: number) {
    navegar({ ...filtrosAtuais, page: String(novaPagina) });
  }

  function navegar(params: FiltrosAtuais) {
    const qs = new URLSearchParams();
    if (params.funcionarioId) qs.set("funcionarioId", params.funcionarioId);
    if (params.turnoId) qs.set("turnoId", params.turnoId);
    if (params.escalaId) qs.set("escalaId", params.escalaId);
    if (params.dataInicio) qs.set("dataInicio", params.dataInicio);
    if (params.dataFim) qs.set("dataFim", params.dataFim);
    if (params.substituido) qs.set("substituido", params.substituido);
    if (params.page) qs.set("page", params.page);
    const texto = qs.toString();
    router.push(texto ? `${pathname}?${texto}` : pathname);
  }

  function limparFiltros() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 border-2 border-black bg-white p-5 shadow-[4px_4px_0_0_#000] dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Funcionário
          <select
            value={filtrosAtuais.funcionarioId ?? ""}
            onChange={(e) => navegarComFiltro("funcionarioId", e.target.value)}
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
            value={filtrosAtuais.turnoId ?? ""}
            onChange={(e) => navegarComFiltro("turnoId", e.target.value)}
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
            value={filtrosAtuais.escalaId ?? ""}
            onChange={(e) => navegarComFiltro("escalaId", e.target.value)}
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
            value={filtrosAtuais.dataInicio ?? ""}
            onChange={(e) => navegarComFiltro("dataInicio", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Até
          <input
            type="date"
            value={filtrosAtuais.dataFim ?? ""}
            onChange={(e) => navegarComFiltro("dataFim", e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Substituído?
          <select
            value={filtrosAtuais.substituido ?? ""}
            onChange={(e) => navegarComFiltro("substituido", e.target.value)}
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
          {total} alocaç{total === 1 ? "ão" : "ões"}
          {total > 0 && ` · página ${page} de ${totalPaginas}`}
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
            {alocacoes.map((a) => {
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
            {alocacoes.length === 0 && (
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

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-black dark:text-zinc-50">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => navegarComPagina(page - 1)}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            ← Anterior
          </button>
          <span>
            Página {page} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={page >= totalPaginas}
            onClick={() => navegarComPagina(page + 1)}
            className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
