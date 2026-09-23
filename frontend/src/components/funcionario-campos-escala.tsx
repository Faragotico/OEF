"use client";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};

export type CamposEscala = {
  /** Valor do <select>, por isso string e não number. */
  turnoPadraoId: string;
  coringa: boolean;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
};

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

export function turnoLabel(t: Turno) {
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

// ============================================================
// Os campos do cadastro que alimentam o motor de escala, num
// componente só — as telas de novo e de editar mostravam exatamente
// os mesmos controles em duas cópias, e toda mudança tinha que ser
// feita duas vezes.
//
// "Coringa" deixou de ser um campo gravado e virou o que sempre
// significou: não ter horário de casa. Marcar a caixa limpa o turno
// padrão e abre a lista de habilitações; é a mesma escolha de antes,
// só que agora ela grava o dado que o motor realmente usa, em vez de
// gravar um booleano em paralelo que podia discordar dele.
// ============================================================
export function FuncionarioCamposEscala({
  turnos,
  postoId,
  valor,
  onChange,
}: {
  turnos: Turno[];
  /** Posto escolhido no formulário — filtra a grade de horários. */
  postoId: string;
  valor: CamposEscala;
  onChange: (proximo: CamposEscala) => void;
}) {
  const turnosDoPosto = postoId
    ? turnos.filter((t) => t.postoId === Number(postoId))
    : turnos.filter((t) => t.postoId !== null);

  const alternarHabilitacao = (turnoId: number) =>
    onChange({
      ...valor,
      turnosHabilitadosIds: valor.turnosHabilitadosIds.includes(turnoId)
        ? valor.turnosHabilitadosIds.filter((id) => id !== turnoId)
        : [...valor.turnosHabilitadosIds, turnoId],
    });

  const alternarDia = (dia: number) =>
    onChange({
      ...valor,
      diasSemanaVetados: valor.diasSemanaVetados.includes(dia)
        ? valor.diasSemanaVetados.filter((d) => d !== dia)
        : [...valor.diasSemanaVetados, dia],
    });

  return (
    <>
      <label className="flex items-start gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="mt-1"
          checked={valor.coringa}
          onChange={(e) =>
            onChange({
              ...valor,
              coringa: e.target.checked,
              // Coringa é, por definição, quem não tem horário de casa.
              turnoPadraoId: e.target.checked ? "" : valor.turnoPadraoId,
              // Ao marcar, já vem habilitado em toda a grade do posto —
              // é o que um coringa faz na prática, e desmarcar um ou
              // outro depois é mais rápido do que marcar todos.
              turnosHabilitadosIds: e.target.checked
                ? turnosDoPosto.map((t) => t.id)
                : [],
            })
          }
        />
        <span>
          É coringa (sem horário de casa; cobre os turnos em que estiver habilitado)
        </span>
      </label>

      {!valor.coringa && (
        <label className="flex flex-col gap-1 text-sm text-text">
          Turno de casa
          <select
            value={valor.turnoPadraoId}
            onChange={(e) => onChange({ ...valor, turnoPadraoId: e.target.value })}
            className={inputClass}
          >
            <option value="">Sem turno de casa</option>
            {turnosDoPosto.map((t) => (
              <option key={t.id} value={t.id}>
                {turnoLabel(t)}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Por padrão a geração só escala esta pessoa neste horário — é o que as
            escalas reais mostram, cada um no mesmo turno o mês inteiro.
          </span>
        </label>
      )}

      <fieldset className="flex flex-col gap-1.5 text-sm text-text">
        <legend className="mb-1">
          {valor.coringa ? "Turnos que este coringa cobre" : "Também pode cobrir (opcional)"}
        </legend>
        {turnosDoPosto.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Escolha um posto acima pra ver a grade de horários dele.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {turnosDoPosto.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={valor.turnosHabilitadosIds.includes(t.id)}
                  onChange={() => alternarHabilitacao(t.id)}
                />
                {turnoLabel(t)}
              </label>
            ))}
          </div>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {valor.coringa
            ? "Um coringa precisa de pelo menos um turno marcado — sem nenhum, o cadastro fica incompleto e ele não entra na geração."
            : "Só usado quando o gestor liga “deixar titular cobrir turno que não é o dele” na tela de geração."}
        </span>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5 text-sm text-text">
        <legend className="mb-1">Nunca trabalha em (opcional)</legend>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((nome, dia) => {
            const marcado = valor.diasSemanaVetados.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                aria-pressed={marcado}
                onClick={() => alternarDia(dia)}
                className={
                  "rounded-md border border-border px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors " +
                  (marcado
                    ? "bg-primary text-white"
                    : "bg-card text-text hover:bg-text/5")
                }
              >
                {nome}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Caso real dos quadros do cliente: há funcionário que nunca trabalha domingo.
          Até aqui isso só existia como ajuste manual depois de gerar.
        </span>
      </fieldset>
    </>
  );
}
