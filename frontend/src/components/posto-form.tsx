"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

type Empresa = { id: number; nome: string };

type ValoresPosto = {
  nome: string;
  localizacao: string;
  empresaId: string;
};

export function PostoForm({
  id,
  empresas,
  valoresIniciais,
  onSalvo,
}: {
  id?: number;
  empresas: Empresa[];
  valoresIniciais?: ValoresPosto;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresPosto>(
    valoresIniciais ?? {
      nome: "",
      localizacao: "",
      empresaId: String(empresas[0]?.id ?? ""),
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      nome: form.nome,
      localizacao: form.localizacao,
      empresaId: Number(form.empresaId),
    };

    try {
      if (modoEdicao) {
        await apiPatch(`/postos/${id}`, payload);
      } else {
        await apiPost("/postos", payload);
      }
      if (onSalvo) {
        onSalvo();
      } else {
        router.push("/postos");
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
        Localização
        <input
          required
          minLength={3}
          maxLength={150}
          value={form.localizacao}
          onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Empresa
        <select
          required
          value={form.empresaId}
          onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
          className={inputClass}
        >
          {empresas.length === 0 && <option value="">Nenhuma cadastrada</option>}
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </label>
      {empresas.length === 0 && (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Cadastre uma empresa antes de criar um posto.
        </p>
      )}

      {error && (
        <p className="border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || empresas.length === 0}
        className="mt-2 border-2 border-black bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
