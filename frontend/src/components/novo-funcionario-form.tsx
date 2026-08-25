"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
};

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

function turnoLabel(t: Turno) {
  return t.descricao
    ? `${t.descricao} (${t.horaInicio}–${t.horaFim})`
    : `${t.horaInicio}–${t.horaFim}`;
}

export function NovoFuncionarioForm({ turnos }: { turnos: Turno[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    cargo: "",
    cargaHorariaSemanal: 44,
    status: true,
    turnoPadraoId: "",
    coringa: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPost("/funcionarios", {
        nome: form.nome,
        cpf: form.cpf,
        telefone: form.telefone || undefined,
        cargo: form.cargo,
        cargaHorariaSemanal: Number(form.cargaHorariaSemanal),
        status: form.status,
        turnoPadraoId: form.turnoPadraoId
          ? Number(form.turnoPadraoId)
          : undefined,
        coringa: form.coringa,
      });
      router.push("/funcionarios");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Nome
        <input
          required
          minLength={3}
          maxLength={100}
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        CPF (somente números, 11 dígitos)
        <input
          required
          inputMode="numeric"
          maxLength={11}
          value={form.cpf}
          onChange={(e) =>
            setForm({ ...form, cpf: e.target.value.replace(/\D/g, "") })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Telefone (opcional)
        <input
          value={form.telefone}
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Cargo
        <input
          required
          minLength={2}
          maxLength={80}
          value={form.cargo}
          onChange={(e) => setForm({ ...form, cargo: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Carga horária semanal (h)
        <input
          type="number"
          required
          min={1}
          max={168}
          value={form.cargaHorariaSemanal}
          onChange={(e) =>
            setForm({
              ...form,
              cargaHorariaSemanal: Number(e.target.value),
            })
          }
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-black dark:text-zinc-50">
        <input
          type="checkbox"
          checked={form.coringa}
          onChange={(e) =>
            setForm({
              ...form,
              coringa: e.target.checked,
              turnoPadraoId: e.target.checked ? "" : form.turnoPadraoId,
            })
          }
        />
        É coringa (cobre a folga de outros funcionários, sem turno fixo)
      </label>

      {!form.coringa && (
        <>
          <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
            Turno padrão (horário fixo deste funcionário)
            <select
              value={form.turnoPadraoId}
              onChange={(e) =>
                setForm({ ...form, turnoPadraoId: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Sem turno padrão definido</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {turnoLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            É esse horário que a geração automática de escala usa pra alocar
            o funcionário todo mês. Sem ele, o funcionário fica de fora da
            geração automática (a menos que seja coringa).
          </p>
        </>
      )}
      {form.coringa && (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Um coringa não tem turno fixo: a geração automática atribui a
          ele, dia a dia, o turno de quem estiver de folga naquele dia.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-black dark:text-zinc-50">
        <input
          type="checkbox"
          checked={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.checked })}
        />
        Ativo
      </label>

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
