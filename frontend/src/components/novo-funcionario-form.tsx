"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { formatarTelefone } from "@/lib/telefone";
import {
  type CamposEscala,
  FuncionarioCamposEscala,
} from "@/components/funcionario-campos-escala";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};
type Posto = { id: number; nome: string; localizacao: string };

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

export function NovoFuncionarioForm({
  turnos,
  postos,
  onSalvo,
}: {
  turnos: Turno[];
  postos: Posto[];
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    cargo: "",
    cargaHorariaSemanal: 44,
    status: true,
    postoId: "",
  });
  const [escala, setEscala] = useState<CamposEscala>({
    turnoPadraoId: "",
    coringa: false,
    turnosHabilitadosIds: [],
    diasSemanaVetados: [],
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
        postoId: form.postoId ? Number(form.postoId) : undefined,
        // "coringa" não é mais um campo do cadastro: o que vai pro
        // servidor é o dado que o define — sem turno de casa, com
        // habilitações.
        turnoPadraoId: escala.turnoPadraoId ? Number(escala.turnoPadraoId) : undefined,
        turnosHabilitadosIds: escala.turnosHabilitadosIds,
        diasSemanaVetados: escala.diasSemanaVetados,
      });
      if (onSalvo) onSalvo();
      else router.push("/funcionarios");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text">
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

      <label className="flex flex-col gap-1 text-sm text-text">
        CPF (somente números, 11 dígitos)
        <input
          required
          inputMode="numeric"
          maxLength={11}
          value={form.cpf}
          onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "") })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        Telefone (opcional)
        <input
          type="tel"
          maxLength={15}
          placeholder="(42) 99911-0001"
          pattern="\(\d{2}\) \d{4,5}-\d{4}"
          title="Telefone no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX"
          value={form.telefone}
          onChange={(e) =>
            // Só dígito entra de fato — letra e símbolo digitado são
            // descartados, e "(", ")", espaço e "-" são inseridos
            // automaticamente pela máscara (ver lib/telefone.ts).
            setForm({ ...form, telefone: formatarTelefone(e.target.value) })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
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

      <label className="flex flex-col gap-1 text-sm text-text">
        Carga horária semanal (h)
        <input
          type="number"
          required
          min={1}
          max={168}
          value={form.cargaHorariaSemanal}
          onChange={(e) =>
            setForm({ ...form, cargaHorariaSemanal: Number(e.target.value) })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        Posto de trabalho
        <select
          value={form.postoId}
          onChange={(e) =>
            // Trocar de posto zera as habilitações: elas apontam pra
            // turnos do posto anterior, que não existem no novo.
            {
              setForm({ ...form, postoId: e.target.value });
              setEscala({ ...escala, turnoPadraoId: "", turnosHabilitadosIds: [] });
            }
          }
          className={inputClass}
        >
          <option value="">Sem posto definido</option>
          {postos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {p.localizacao}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          A geração automática monta a escala com a equipe do posto escolhido, usando a
          grade de horários dele.
        </span>
      </label>

      <FuncionarioCamposEscala
        turnos={turnos}
        postoId={form.postoId}
        valor={escala}
        onChange={setEscala}
      />

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.checked })}
        />
        Ativo
      </label>

      {error && (
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
