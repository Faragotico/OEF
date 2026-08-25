"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

type ValoresEmpresa = {
  nome: string;
  cnpj: string;
  contato: string;
};

// Um form só, reaproveitado em "Nova empresa" e "Editar empresa" — a
// única diferença entre os dois é POST vs PATCH e os valores iniciais.
export function EmpresaForm({
  id,
  valoresIniciais,
}: {
  id?: number;
  valoresIniciais?: ValoresEmpresa;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresEmpresa>(
    valoresIniciais ?? { nome: "", cnpj: "", contato: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      nome: form.nome,
      cnpj: form.cnpj,
      contato: form.contato || undefined,
    };

    try {
      if (modoEdicao) {
        await apiPatch(`/empresas/${id}`, payload);
      } else {
        await apiPost("/empresas", payload);
      }
      router.push("/empresas");
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
        CNPJ (14 caracteres, sem máscara — alfanumérico a partir de 2026)
        <input
          required
          maxLength={14}
          value={form.cnpj}
          onChange={(e) =>
            setForm({ ...form, cnpj: e.target.value.toUpperCase() })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Contato (opcional)
        <input
          maxLength={100}
          value={form.contato}
          onChange={(e) => setForm({ ...form, contato: e.target.value })}
          className={inputClass}
        />
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
