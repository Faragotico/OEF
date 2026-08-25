"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

type ValoresTurno = {
  descricao: string;
  horaInicio: string;
  horaFim: string;
};

export function TurnoForm({
  id,
  valoresIniciais,
}: {
  id?: number;
  valoresIniciais?: ValoresTurno;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresTurno>(
    valoresIniciais ?? { descricao: "", horaInicio: "", horaFim: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      descricao: form.descricao || undefined,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
    };

    try {
      if (modoEdicao) {
        await apiPatch(`/turno/${id}`, payload);
      } else {
        await apiPost("/turno", payload);
      }
      router.push("/turnos");
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
        O fim precisa ser depois do início — este sistema não tem turno
        que atravessa a meia-noite.
      </p>

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
