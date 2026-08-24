"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

const inputClass =
  "rounded-md border border-black/[.08] bg-white px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-white";

export default function NovoFuncionarioPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    cargo: "",
    cargaHorariaSemanal: 44,
    status: true,
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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black sm:px-16">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Novo Funcionário
        </h1>

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
              checked={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.checked })}
            />
            Ativo
          </label>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </main>
  );
}
