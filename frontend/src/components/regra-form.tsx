"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

const inputClass =
  "border-2 border-black bg-white px-3 py-2 text-sm text-black dark:bg-zinc-900 dark:text-white";

// Tipos já usados pelo motor de geração/validação de escala (ver
// RegrasTrabalhistasService) — sugeridos aqui só pra ajudar a digitar
// certo, mas o campo aceita qualquer texto (não é um enum no banco).
const TIPOS_CONHECIDOS = [
  "escala",
  "intervalo_interjornada",
  "intervalo_intrajornada",
  "carga_horaria_semanal",
  "descanso_semanal",
];

type ValoresRegra = {
  descricao: string;
  tipo: string;
  valor: string;
};

export function RegraForm({
  id,
  valoresIniciais,
}: {
  id?: number;
  valoresIniciais?: ValoresRegra;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresRegra>(
    valoresIniciais ?? { descricao: "", tipo: "", valor: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (modoEdicao) {
        await apiPatch(`/regras/${id}`, form);
      } else {
        await apiPost("/regras", form);
      }
      router.push("/regras");
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
        Descrição
        <input
          required
          minLength={3}
          maxLength={500}
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Tipo
        <input
          required
          list="tipos-conhecidos"
          minLength={2}
          maxLength={50}
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className={inputClass}
        />
        <datalist id="tipos-conhecidos">
          {TIPOS_CONHECIDOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Tipos que o motor de geração/validação de escala já reconhece:{" "}
        {TIPOS_CONHECIDOS.join(", ")}. Um tipo diferente desses fica só
        cadastrado, sem efeito automático na geração.
      </p>

      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Valor
        <input
          required
          maxLength={50}
          placeholder='Ex: "5x1", "11", "44"'
          value={form.valor}
          onChange={(e) => setForm({ ...form, valor: e.target.value })}
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
