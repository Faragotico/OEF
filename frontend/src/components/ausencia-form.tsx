"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

type Funcionario = { id: number; nome: string; coringa: boolean };

type ValoresAusencia = {
  funcionarioId: string;
  dataInicio: string;
  dataFim: string;
  motivo: string;
  compensacao: string;
};

// Formulário de Ausência — RN02. Sem esta tela, a regra existia no
// motor de geração/validação (RegrasTrabalhistasService nunca aloca
// alguém durante o período aqui registrado) mas ninguém conseguia de
// fato cadastrar uma ausência pelo sistema.
export function AusenciaForm({
  id,
  funcionarios,
  valoresIniciais,
  onSalvo,
}: {
  id?: number;
  funcionarios: Funcionario[];
  valoresIniciais?: ValoresAusencia;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresAusencia>(
    valoresIniciais ?? {
      funcionarioId: String(funcionarios[0]?.id ?? ""),
      dataInicio: "",
      dataFim: "",
      motivo: "",
      compensacao: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      funcionarioId: Number(form.funcionarioId),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      motivo: form.motivo,
      compensacao: form.compensacao || undefined,
    };

    try {
      if (modoEdicao) {
        await apiPatch(`/ausencias/${id}`, payload);
      } else {
        await apiPost("/ausencias", payload);
      }
      if (onSalvo) {
        onSalvo();
      } else {
        router.push("/ausencias");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text">
        Funcionário
        <select
          required
          value={form.funcionarioId}
          onChange={(e) => setForm({ ...form, funcionarioId: e.target.value })}
          className={inputClass}
        >
          {funcionarios.length === 0 && (
            <option value="">Nenhum cadastrado</option>
          )}
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
              {f.coringa ? " (coringa)" : ""}
            </option>
          ))}
        </select>
      </label>
      {funcionarios.length === 0 && (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Cadastre um funcionário antes de registrar uma ausência.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text">
          Data início
          <input
            type="date"
            required
            value={form.dataInicio}
            onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text">
          Data fim
          <input
            type="date"
            required
            value={form.dataFim}
            onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-text">
        Motivo
        <input
          required
          minLength={3}
          maxLength={200}
          placeholder="Ex: atestado médico, licença, falta justificada..."
          value={form.motivo}
          onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        Compensação (opcional)
        <input
          maxLength={200}
          placeholder="Ex: reposta em outro dia, folga descontada..."
          value={form.compensacao}
          onChange={(e) => setForm({ ...form, compensacao: e.target.value })}
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || funcionarios.length === 0}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
