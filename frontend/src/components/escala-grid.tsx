"use client";

import { useState } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};
type FuncionarioGrid = {
  id: number;
  nome: string;
  coringa: boolean;
  turnoPadrao: Turno | null;
};
type AlocacaoGrid = {
  id: number;
  funcionarioId: number;
  data: string;
  turnoId: number;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Todas as datas "AAAA-MM-DD" entre dataInicio e dataFim, inclusive —
// vira o eixo de linhas da grade (um dia por linha, igual aos PDFs
// mensais reais que o cliente mandou).
function diasDoPeriodo(dataInicio: string, dataFim: string): string[] {
  if (!dataInicio || !dataFim) return [];
  const dias: string[] = [];
  const cursor = new Date(`${dataInicio}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  while (cursor <= fim) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

function diaSemana(dataIso: string): string {
  return DIAS_SEMANA[new Date(`${dataIso}T00:00:00Z`).getUTCDay()];
}

function ehDomingo(dataIso: string): boolean {
  return new Date(`${dataIso}T00:00:00Z`).getUTCDay() === 0;
}

function turnoLabel(t: Turno | null | undefined) {
  if (!t) return "sem turno padrão";
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

// Grade dia x funcionário — mesmo formato de leitura das escalas reais
// da Sharon Pontes: cada coluna é um funcionário, cada linha um dia.
// Célula "·" = trabalha no turno padrão dele. "F" = folga. Célula com
// horário = está num turno DIFERENTE do padrão nesse dia — cobre tanto
// o coringa (não tem padrão, então todo dia trabalhado aparece com
// horário) quanto uma substituição/troca pontual feita depois na
// Alocacao de um titular.
//
// Reaproveitado em dois lugares: logo após gerar uma escala nova
// (dados ainda em memória) e ao reabrir uma escala já salva (dados
// vindos do banco via GET /alocacoes) — o componente não differencia,
// só recebe as alocações prontas. Cada alocação já criada tem um id
// real no banco (mesmo a recém-gerada), então dá pra editar/remover
// clicando na célula — é a alteração manual pontual da escala
// (UC "editar alocação"), sem precisar ir na API na mão.
export function EscalaGrid({
  dataInicio,
  dataFim,
  funcionarios,
  turnos,
  alocacoes,
  folgaMotivos,
  escalaId,
}: {
  dataInicio: string;
  dataFim: string;
  funcionarios: FuncionarioGrid[];
  turnos: Turno[];
  alocacoes: AlocacaoGrid[];
  folgaMotivos?: Map<string, string>;
  escalaId: number;
}) {
  const [alocacoesState, setAlocacoesState] = useState(alocacoes);
  const [editando, setEditando] = useState<{
    funcionarioId: number;
    data: string;
  } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroCelula, setErroCelula] = useState<string | null>(null);

  const dias = diasDoPeriodo(dataInicio, dataFim);
  const turnoById = new Map(turnos.map((t) => [t.id, t]));

  // Titulares ordenados pelo horário de início, coringas por último —
  // fica mais fácil acompanhar a cobertura ao longo do dia (relevante
  // sobretudo em postos com vários horários, tipo abertura/meio/
  // fechamento) do que na ordem em que os funcionários foram marcados.
  const funcionariosOrdenados = [...funcionarios].sort((a, b) => {
    if (a.coringa !== b.coringa) return a.coringa ? 1 : -1;
    return (a.turnoPadrao?.horaInicio ?? "").localeCompare(
      b.turnoPadrao?.horaInicio ?? "",
    );
  });

  const colunas = funcionariosOrdenados.map((f) => {
    const alocacaoPorDia = new Map<string, AlocacaoGrid>();
    for (const a of alocacoesState) {
      if (a.funcionarioId === f.id) alocacaoPorDia.set(a.data, a);
    }
    return { ...f, alocacaoPorDia };
  });

  if (dias.length === 0 || colunas.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem dados suficientes para montar a grade.
      </p>
    );
  }

  async function salvarCelula(
    funcionarioId: number,
    data: string,
    atual: AlocacaoGrid | undefined,
    valorEscolhido: string,
  ) {
    setSalvando(true);
    setErroCelula(null);
    try {
      if (valorEscolhido === "folga") {
        if (atual) {
          await apiDelete(`/alocacoes/${atual.id}`);
          setAlocacoesState((prev) => prev.filter((a) => a.id !== atual.id));
        }
      } else {
        const turnoId = Number(valorEscolhido);
        if (atual) {
          await apiPatch(`/alocacoes/${atual.id}`, { turnoId });
          setAlocacoesState((prev) =>
            prev.map((a) => (a.id === atual.id ? { ...a, turnoId } : a)),
          );
        } else {
          const criada = await apiPost<AlocacaoGrid>("/alocacoes", {
            escalaId,
            funcionarioId,
            data,
            turnoId,
          });
          setAlocacoesState((prev) => [...prev, criada]);
        }
      }
      setEditando(null);
    } catch (err) {
      setErroCelula(
        err instanceof Error ? err.message : "Erro ao salvar a alteração.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Clique numa célula pra alterar manualmente (folga, turno diferente ou
        cobertura). A validação das regras trabalhistas pode ser refeita
        depois em &quot;Validar escala&quot;.
      </p>

      {erroCelula && (
        <p className="border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
          {erroCelula}
        </p>
      )}

      <div className="overflow-x-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000] dark:bg-zinc-900">
        <table className="w-full border-collapse text-center text-sm">
          <thead className="bg-red-100 dark:bg-red-950/40">
            <tr>
              <th className="sticky left-0 z-10 bg-red-100 px-4 py-3 text-left font-medium dark:bg-zinc-900">
                Dia
              </th>
              {colunas.map((f) => (
                <th key={f.id} className="px-4 py-3 font-medium">
                  <div>{f.nome}</div>
                  <div className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {f.coringa ? "coringa" : turnoLabel(f.turnoPadrao)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr
                key={dia}
                className={
                  "border-t-2 border-black " +
                  (ehDomingo(dia) ? "bg-red-50 dark:bg-red-950/20" : "")
                }
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2 text-left dark:bg-black">
                  {dia}{" "}
                  <span className="text-zinc-400">({diaSemana(dia)})</span>
                </td>
                {colunas.map((f) => {
                  const atual = f.alocacaoPorDia.get(dia);
                  const estaEditandoEstaCelula =
                    editando?.funcionarioId === f.id && editando?.data === dia;

                  if (estaEditandoEstaCelula) {
                    return (
                      <td key={f.id} className="px-2 py-1">
                        <select
                          autoFocus
                          disabled={salvando}
                          defaultValue={atual ? String(atual.turnoId) : "folga"}
                          onChange={(e) =>
                            salvarCelula(f.id, dia, atual, e.target.value)
                          }
                          onBlur={() => setEditando(null)}
                          className="w-full border-2 border-black bg-white px-1 py-1 text-xs dark:bg-zinc-900 dark:text-white"
                        >
                          <option value="folga">Folga</option>
                          {turnos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.horaInicio}–{t.horaFim}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (!atual) {
                    const motivo = folgaMotivos?.get(`${f.id}|${dia}`);
                    return (
                      <td
                        key={f.id}
                        title={motivo ?? "Clique pra editar"}
                        onClick={() => setEditando({ funcionarioId: f.id, data: dia })}
                        className="cursor-pointer bg-red-600 px-4 py-2 font-black text-white hover:bg-red-700"
                      >
                        F
                      </td>
                    );
                  }

                  const ehPadrao = !f.coringa && atual.turnoId === f.turnoPadrao?.id;
                  if (ehPadrao) {
                    return (
                      <td
                        key={f.id}
                        title="Clique pra editar"
                        onClick={() => setEditando({ funcionarioId: f.id, data: dia })}
                        className="cursor-pointer px-4 py-2 text-zinc-300 hover:bg-zinc-100 dark:text-zinc-700 dark:hover:bg-zinc-800"
                      >
                        ·
                      </td>
                    );
                  }

                  const turno = turnoById.get(atual.turnoId);
                  return (
                    <td
                      key={f.id}
                      title={
                        (f.coringa
                          ? "Cobrindo turno de outro funcionário"
                          : "Turno alterado nesse dia (substituição/troca)") +
                        " — clique pra editar"
                      }
                      onClick={() => setEditando({ funcionarioId: f.id, data: dia })}
                      className="cursor-pointer bg-red-100 px-4 py-2 text-xs font-bold text-red-900 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/70"
                    >
                      {turno ? `${turno.horaInicio}–${turno.horaFim}` : `#${atual.turnoId}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
