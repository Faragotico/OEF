"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/api";
import { formatarTelefone } from "@/lib/telefone";
import { Rotulo } from "@/components/rotulo";
import { Aviso } from "@/components/aviso";
import { StatusToggle } from "@/components/status-toggle";
import {
  type CamposEscala,
  FuncionarioCamposEscala,
} from "@/components/funcionario-campos-escala";
import { rotuloPosto } from "@/lib/posto-rotulo";

type Turno = {
  id: number;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  postoId: number | null;
};

type Posto = {
  id: number;
  nome: string;
  localizacao: string;
  empresa?: { nome: string } | null;
};

export type ValoresFuncionario = {
  nome: string;
  cpf: string;
  telefone: string;
  cargo: string;
  cargaHorariaSemanal: number;
  status: boolean;
  postoId: string;
  turnoPadraoId: string;
  coringa: boolean;
  turnosHabilitadosIds: number[];
  diasSemanaVetados: number[];
};

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// Mesmo formulário do cadastro (NovoFuncionarioForm), só que em modo
// edição: PATCH em vez de POST, vem pré-preenchido, e o CPF não pode
// ser alterado aqui (RN02/histórico dependem dele — trocar CPF de
// funcionário já cadastrado é caso raro demais pra valer a complexidade
// extra; se precisar, dá pra fazer direto na API).
//
// Os campos que alimentam o motor de escala (turno de casa, coringa,
// habilitações, dias vetados) vêm do FuncionarioCamposEscala, que é o
// mesmo componente das duas telas — antes eram duas cópias e toda
// mudança tinha que ser feita nos dois lugares.
export function EditarFuncionarioForm({
  id,
  turnos,
  postos,
  valoresIniciais,
  onSalvo,
}: {
  id: number;
  turnos: Turno[];
  postos: Posto[];
  valoresIniciais: ValoresFuncionario;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(valoresIniciais);
  const [escala, setEscala] = useState<CamposEscala>({
    turnoPadraoId: valoresIniciais.turnoPadraoId,
    coringa: valoresIniciais.coringa,
    turnosHabilitadosIds: valoresIniciais.turnosHabilitadosIds,
    diasSemanaVetados: valoresIniciais.diasSemanaVetados,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiPatch(`/funcionarios/${id}`, {
        nome: form.nome,
        telefone: form.telefone || undefined,
        cargo: form.cargo.trim() || null,
        cargaHorariaSemanal: Number(form.cargaHorariaSemanal),
        status: form.status,
        postoId: form.postoId ? Number(form.postoId) : null,
        // null limpa o turno de casa (é assim que alguém vira coringa).
        turnoPadraoId: escala.turnoPadraoId ? Number(escala.turnoPadraoId) : null,
        turnosHabilitadosIds: escala.turnosHabilitadosIds,
        diasSemanaVetados: escala.diasSemanaVetados,
      });
      if (onSalvo) onSalvo();
      else router.push("/funcionarios");
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
        <Rotulo obrigatorio>Nome</Rotulo>
        <input
          required
          minLength={3}
          maxLength={100}
          placeholder="Ex.: Maria Silva Santos"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
        CPF (não editável)
        <input
          disabled
          value={form.cpf}
          className="border-2 border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo opcional>Telefone</Rotulo>
        <input
          type="tel"
          maxLength={15}
          placeholder="(42) 99911-0001"
          pattern="\(\d{2}\) \d{4,5}-\d{4}"
          title="Telefone no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX"
          value={form.telefone}
          onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo opcional dica="Só uma etiqueta do que a pessoa faz. Não altera a escala.">
          Cargo
        </Rotulo>
        <input
          minLength={2}
          maxLength={80}
          placeholder="Ex.: Operadora de Caixa"
          value={form.cargo}
          onChange={(e) => setForm({ ...form, cargo: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo obrigatorio>Carga horária semanal (h)</Rotulo>
        <input
          type="number"
          required
          min={1}
          max={168}
          placeholder="Ex.: 44"
          value={form.cargaHorariaSemanal}
          onChange={(e) =>
            setForm({ ...form, cargaHorariaSemanal: Number(e.target.value) })
          }
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo opcional>Posto de trabalho</Rotulo>
        <select
          value={form.postoId}
          onChange={(e) => {
            // Trocar de posto zera turno de casa e habilitações: elas
            // apontam pra turnos que não existem na grade do novo posto.
            // Coringa já vem habilitado em toda a grade do posto NOVO
            // (mesma regra de marcar a caixa de coringa).
            const novoPostoId = e.target.value;
            setForm({ ...form, postoId: novoPostoId });
            setEscala({
              ...escala,
              turnoPadraoId: "",
              turnosHabilitadosIds:
                escala.coringa && novoPostoId
                  ? turnos
                      .filter((t) => t.postoId === Number(novoPostoId))
                      .map((t) => t.id)
                  : [],
            });
          }}
          className={inputClass}
        >
          <option value="">Sem posto definido</option>
          {postos.map((p) => (
            <option key={p.id} value={p.id}>
              {rotuloPosto(p)} — {p.localizacao}
            </option>
          ))}
        </select>
      </label>

      <FuncionarioCamposEscala
        turnos={turnos}
        postoId={form.postoId}
        valor={escala}
        onChange={setEscala}
      />

      <StatusToggle
        value={form.status}
        onChange={(status) => setForm({ ...form, status })}
      />

      {error && (
        <Aviso nivel="erro" titulo={error} />
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
