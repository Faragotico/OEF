"use client";

import { Rotulo } from "@/components/rotulo";
import { Dica } from "@/components/dica";

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
  // Sem posto escolhido não há grade pra mostrar: turno pertence a um
  // posto, e a geração automática monta a escala com a equipe de UM
  // posto. (Turno avulso, sem posto, só nasce do "horário
  // personalizado" da tela de Alocação — não entra neste formulário.)
  const turnosDoPosto = postoId
    ? turnos.filter((t) => t.postoId === Number(postoId))
    : [];

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
          É coringa (sem horário de casa)
          <Dica>Coringa não tem horário fixo: cobre a folga dos titulares nos turnos marcados abaixo.</Dica>
        </span>
      </label>

      {!valor.coringa && (
        <label className="flex flex-col gap-1 text-sm text-text">
          <Rotulo opcional dica="Horário em que a geração escala esta pessoa.">
            Turno de casa
          </Rotulo>
          <select
            value={valor.turnoPadraoId}
            onChange={(e) => onChange({ ...valor, turnoPadraoId: e.target.value })}
            disabled={!postoId}
            className={inputClass + " disabled:opacity-60"}
          >
            <option value="">Sem turno de casa</option>
            {turnosDoPosto.map((t) => (
              <option key={t.id} value={t.id}>
                {turnoLabel(t)}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-1.5 text-sm text-text">
        <legend className="mb-1">
          {valor.coringa ? (
            <Rotulo obrigatorio dica="Coringa precisa de pelo menos um turno.">
              Turnos que este coringa cobre
            </Rotulo>
          ) : (
            <Rotulo opcional dica="Vale só se a geração permitir cobrir outro turno.">
              Também pode cobrir
            </Rotulo>
          )}
        </legend>
        {turnosDoPosto.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {postoId
              ? "Este posto ainda não tem turnos cadastrados. Cadastre em Turnos."
              : "Escolha um posto acima pra ver a grade de horários dele."}
          </p>
        ) : (
          <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
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
      </fieldset>

      <fieldset className="flex flex-col gap-1.5 text-sm text-text">
        <legend className="mb-1">
          <Rotulo opcional dica="Dias da semana em que a geração nunca escala esta pessoa.">
            Nunca trabalha em
          </Rotulo>
        </legend>
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
      </fieldset>
    </>
  );
}
