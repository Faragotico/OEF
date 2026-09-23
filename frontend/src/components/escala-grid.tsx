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
// O que volta da API inclui o turno junto (o repository usa
// include: { turno: true }) — usamos isso só quando o turno é um
// "horário personalizado" recém-criado, pra já saber exibir ele sem
// precisar recarregar a página inteira.
type AlocacaoApiResponse = AlocacaoGrid & { turno?: Turno };

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

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Só o número do dia ("01"), sem repetir ano/mês em toda linha — o
// mês/ano aparece uma vez só, na primeira linha de cada mês (ver
// mesAnoLabel abaixo), pra ter bem menos informação repetida na tela.
function diaCurto(dataIso: string): string {
  return dataIso.slice(8, 10);
}

function mesAnoLabel(dataIso: string): string {
  const [ano, mes] = dataIso.split("-");
  return `${MESES_ABREV[Number(mes) - 1]}/${ano}`;
}

function turnoLabel(t: Turno | null | undefined) {
  if (!t) return "sem turno padrão";
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

// Duração de um turno em horas, a partir dos horários "HH:MM" — não
// espera turno virando meia-noite (não existe caso assim no domínio,
// posto de porteiro/recepcionista com horário comercial), mas soma 24h
// se acontecer pra não dar duração negativa.
function horasDoTurno(t: Turno): number {
  const [hi, mi] = t.horaInicio.split(":").map(Number);
  const [hf, mf] = t.horaFim.split(":").map(Number);
  let minutos = hf * 60 + mf - (hi * 60 + mi);
  if (minutos <= 0) minutos += 24 * 60;
  return minutos / 60;
}

function formatarHoras(horas: number): string {
  const arredondado = Math.round(horas * 10) / 10;
  return `${arredondado.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
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
  intervaloIntrajornadaHoras = 1,
}: {
  dataInicio: string;
  dataFim: string;
  funcionarios: FuncionarioGrid[];
  turnos: Turno[];
  alocacoes: AlocacaoGrid[];
  folgaMotivos?: Map<string, string>;
  escalaId: number;
  // Pausa dentro do turno (almoço etc.) que não conta como hora
  // trabalhada — descontada de cada alocação antes de somar no total
  // "no período". Mesmo valor usado pelo backend no RN04 e no PDF (regra
  // global "intervalo_intrajornada", padrão 1h). Passado pela página que
  // busca /regras; se não vier, assume 1h pra bater com o padrão do
  // backend quando a regra não está cadastrada.
  intervaloIntrajornadaHoras?: number;
}) {
  const [alocacoesState, setAlocacoesState] = useState(alocacoes);
  // Turnos conhecidos pela grade — começa com os cadastrados, e ganha
  // um item novo sempre que alguém salva um horário personalizado
  // (assim a célula mostra o horário certo sem precisar recarregar).
  const [turnosState, setTurnosState] = useState(turnos);
  const [editando, setEditando] = useState<{
    funcionarioId: number;
    data: string;
  } | null>(null);
  // true = a célula em edição está mostrando os dois campos de
  // horário personalizado em vez do <select> de turnos cadastrados.
  const [modoCustom, setModoCustom] = useState(false);
  const [horaInicioCustom, setHoraInicioCustom] = useState("");
  const [horaFimCustom, setHoraFimCustom] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroCelula, setErroCelula] = useState<string | null>(null);

  // Fecha a edição de uma célula e limpa qualquer estado de horário
  // personalizado que tivesse ficado pra trás.
  function fecharEdicao() {
    setEditando(null);
    setModoCustom(false);
    setHoraInicioCustom("");
    setHoraFimCustom("");
  }

  function abrirEdicao(funcionarioId: number, data: string) {
    setEditando({ funcionarioId, data });
    setModoCustom(false);
    setHoraInicioCustom("");
    setHoraFimCustom("");
  }

  const dias = diasDoPeriodo(dataInicio, dataFim);

  // Numa escala típica (1 mês só), o "mês/ano" fica no cabeçalho da
  // coluna "Dia" — não precisa repetir em cada linha. Só quando o
  // período cobre mais de um mês (raro) é que não dá pra cravar um só
  // mês no cabeçalho; nesse caso volta a mostrar na primeira linha de
  // cada mês, dentro da própria coluna (ver diasComMesAno).
  const mesesNoPeriodo = new Set(dias.map(mesAnoLabel));
  const mesAnoUnico = mesesNoPeriodo.size === 1 ? mesAnoLabel(dias[0]) : null;
  const diasComMesAno = mesAnoUnico
    ? new Set<string>()
    : (() => {
        const marcados = new Set<string>();
        let anterior: string | null = null;
        for (const d of dias) {
          const mesAno = mesAnoLabel(d);
          if (mesAno !== anterior) marcados.add(d);
          anterior = mesAno;
        }
        return marcados;
      })();
  const turnoById = new Map(turnosState.map((t) => [t.id, t]));

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
    let horasNoPeriodo = 0;
    for (const a of alocacoesState) {
      if (a.funcionarioId !== f.id) continue;
      alocacaoPorDia.set(a.data, a);
      const turno = turnoById.get(a.turnoId);
      if (turno) {
        horasNoPeriodo += Math.max(
          0,
          horasDoTurno(turno) - intervaloIntrajornadaHoras,
        );
      }
    }
    return { ...f, alocacaoPorDia, horasNoPeriodo };
  });

  if (dias.length === 0 || colunas.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem dados suficientes para montar a grade.
      </p>
    );
  }

  // Registra na grade um turno que voltou junto da resposta da API
  // (só acontece com horário personalizado — a API sempre inclui o
  // turno na resposta, mas só vale a pena guardar quando é um turno
  // que a grade ainda não conhecia).
  function registrarTurnoNovo(turno: Turno | undefined) {
    if (!turno) return;
    setTurnosState((prev) =>
      prev.some((t) => t.id === turno.id) ? prev : [...prev, turno],
    );
  }

  // `turnoPayload` é ou { turnoId } (turno já cadastrado) ou
  // { horaInicio, horaFim } (horário personalizado — o backend acha ou
  // cria um Turno com esse horário e devolve ele já resolvido).
  async function salvarCelula(
    funcionarioId: number,
    data: string,
    atual: AlocacaoGrid | undefined,
    valorEscolhido: string | { horaInicio: string; horaFim: string },
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
        const turnoPayload =
          typeof valorEscolhido === "string"
            ? { turnoId: Number(valorEscolhido) }
            : valorEscolhido;

        if (atual) {
          const atualizada = await apiPatch<AlocacaoApiResponse>(
            `/alocacoes/${atual.id}`,
            turnoPayload,
          );
          registrarTurnoNovo(atualizada.turno);
          setAlocacoesState((prev) =>
            prev.map((a) =>
              a.id === atual.id ? { ...a, turnoId: atualizada.turnoId } : a,
            ),
          );
        } else {
          const criada = await apiPost<AlocacaoApiResponse>("/alocacoes", {
            escalaId,
            funcionarioId,
            data,
            ...turnoPayload,
          });
          registrarTurnoNovo(criada.turno);
          setAlocacoesState((prev) => [...prev, criada]);
        }
      }
      fecharEdicao();
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
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
          {erroCelula}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-center text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium">
                <div>Dia</div>
                {mesAnoUnico && (
                  <div className="text-xs font-semibold uppercase text-primary">
                    {mesAnoUnico}
                  </div>
                )}
              </th>
              {colunas.map((f) => (
                <th key={f.id} className="px-4 py-3 font-medium">
                  <div>{f.nome}</div>
                  <div className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {f.coringa ? "coringa" : turnoLabel(f.turnoPadrao)}
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    {formatarHoras(f.horasNoPeriodo)} no período
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
                  "border-t border-border " +
                  (ehDomingo(dia) ? "bg-text/[0.03]" : "")
                }
              >
                <td className="sticky left-0 z-10 bg-card px-4 py-2 text-left">
                  {diasComMesAno.has(dia) && (
                    <div className="text-[10px] font-semibold uppercase text-primary">
                      {mesAnoLabel(dia)}
                    </div>
                  )}
                  {diaCurto(dia)}{" "}
                  <span className="text-text-secondary">({diaSemana(dia)})</span>
                </td>
                {colunas.map((f) => {
                  const atual = f.alocacaoPorDia.get(dia);
                  const estaEditandoEstaCelula =
                    editando?.funcionarioId === f.id && editando?.data === dia;

                  if (estaEditandoEstaCelula && modoCustom) {
                    const horarioValido =
                      horaInicioCustom !== "" &&
                      horaFimCustom !== "" &&
                      horaFimCustom > horaInicioCustom;
                    return (
                      <td key={f.id} className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="time"
                              disabled={salvando}
                              value={horaInicioCustom}
                              onChange={(e) => setHoraInicioCustom(e.target.value)}
                              className="w-full rounded-md border border-border bg-card px-1 py-1 text-xs text-text"
                            />
                            <span className="text-xs">–</span>
                            <input
                              type="time"
                              disabled={salvando}
                              value={horaFimCustom}
                              onChange={(e) => setHoraFimCustom(e.target.value)}
                              className="w-full rounded-md border border-border bg-card px-1 py-1 text-xs text-text"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={salvando || !horarioValido}
                              onClick={() =>
                                salvarCelula(f.id, dia, atual, {
                                  horaInicio: horaInicioCustom,
                                  horaFim: horaFimCustom,
                                })
                              }
                              className="flex-1 rounded-md bg-primary px-1 py-1 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              disabled={salvando}
                              onClick={fecharEdicao}
                              className="rounded-md border border-border bg-card px-1 py-1 text-xs text-text"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  }

                  if (estaEditandoEstaCelula) {
                    return (
                      <td key={f.id} className="px-2 py-1">
                        <select
                          autoFocus
                          disabled={salvando}
                          defaultValue={atual ? String(atual.turnoId) : "folga"}
                          onChange={(e) => {
                            if (e.target.value === "custom") {
                              setModoCustom(true);
                              return;
                            }
                            salvarCelula(f.id, dia, atual, e.target.value);
                          }}
                          className="w-full rounded-md border border-border bg-card px-1 py-1 text-xs text-text"
                        >
                          <option value="folga">Folga</option>
                          {turnosState.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.horaInicio}–{t.horaFim}
                            </option>
                          ))}
                          <option value="custom">Horário personalizado…</option>
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
                        onClick={() => abrirEdicao(f.id, dia)}
                        className="cursor-pointer bg-folga-bg px-4 py-2 font-black text-folga-text hover:brightness-95"
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
                        onClick={() => abrirEdicao(f.id, dia)}
                        className="cursor-pointer px-4 py-2 text-text-secondary/40 hover:bg-text/5"
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
                      onClick={() => abrirEdicao(f.id, dia)}
                      className="cursor-pointer bg-substituicao-bg px-4 py-2 text-xs font-bold text-substituicao-text hover:brightness-95"
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
