"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Posto = { id: number; nome: string; localizacao: string };

export type ValoresTurno = {
  descricao: string;
  horaInicio: string;
  horaFim: string;
  postoId: string;
  demandaPorDiaDaSemana: number[];
};

export function TurnoForm({
  id,
  postos,
  valoresIniciais,
  onSalvo,
}: {
  id?: number;
  postos: Posto[];
  valoresIniciais?: ValoresTurno;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresTurno>(
    valoresIniciais ?? {
      descricao: "",
      horaInicio: "",
      horaFim: "",
      postoId: "",
      demandaPorDiaDaSemana: [1, 1, 1, 1, 1, 1, 1],
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const alternarDia = (dia: number) =>
    setForm({
      ...form,
      demandaPorDiaDaSemana: form.demandaPorDiaDaSemana.map((q, i) =>
        i === dia ? (q > 0 ? 0 : 1) : q,
      ),
    });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      descricao: form.descricao || undefined,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      postoId: form.postoId ? Number(form.postoId) : undefined,
      // Turno avulso (sem posto) não tem demanda: ele não faz parte da
      // grade de lugar nenhum, só existe pra alocação pontual.
      demandaPorDiaDaSemana: form.postoId ? form.demandaPorDiaDaSemana : undefined,
    };

    try {
      if (modoEdicao) await apiPatch(`/turno/${id}`, payload);
      else await apiPost("/turno", payload);
      if (onSalvo) onSalvo();
      else router.push("/turnos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Descrição (opcional)
        <input
          maxLength={100}
          placeholder="Ex: Manhã, Abertura, Fechamento..."
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Início
          <input
            type="time"
            required
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
          Fim
          <input
            type="time"
            required
            value={form.horaFim}
            onChange={(e) => setForm({ ...form, horaFim: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        O fim precisa ser depois do início — este sistema não tem turno que atravessa a
        meia-noite.
      </p>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Posto de trabalho
        <select
          value={form.postoId}
          onChange={(e) => setForm({ ...form, postoId: e.target.value })}
          className={inputClass}
        >
          <option value="">Avulso (não faz parte da grade de nenhum posto)</option>
          {postos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {p.localizacao}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          A geração automática monta a escala a partir dos turnos do posto. Um turno
          pode existir sem ser o horário de casa de ninguém — quem estiver disponível
          cobre.
        </span>
      </label>

      {form.postoId && (
        <fieldset className="flex flex-col gap-2 border-2 border-black p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide">
            Em que dias da semana este turno existe
          </legend>
          <div className="grid grid-cols-7 gap-1.5">
            {DIAS.map((nome, dia) => {
              const aberto = form.demandaPorDiaDaSemana[dia] > 0;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => alternarDia(dia)}
                  aria-pressed={aberto}
                  className={
                    "flex flex-col items-center gap-1 border-2 border-black px-1 py-2 text-xs font-bold uppercase transition-colors " +
                    (aberto
                      ? "bg-red-600 text-white"
                      : "bg-white text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600")
                  }
                >
                  <span className={dia === 0 && !aberto ? "text-red-700 dark:text-red-400" : ""}>
                    {nome}
                  </span>
                  <span className="text-[10px] normal-case">{aberto ? "existe" : "não existe"}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Quem não ficar com nenhuma vaga no dia está de folga — então tirar este
            turno do domingo é o jeito mais direto de dar domingo de folga pra mais gente.{" "}
            <strong>
              Pra cobrir um horário de pico (ex: 11h–14h com mais gente que o normal),
              cadastre outro turno com horário próprio que se sobreponha a este — não é
              aqui que se aumenta quantidade.
            </strong>
          </p>
        </fieldset>
      )}

      {error && (
        <p className="border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 border-2 border-black bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
