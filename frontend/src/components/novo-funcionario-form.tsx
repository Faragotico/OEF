"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { formatarTelefone } from "@/lib/telefone";
import { Rotulo } from "@/components/rotulo";
import { Aviso } from "@/components/aviso";
import { StatusToggle } from "@/components/status-toggle";
import {
  type CamposEscala,
  FuncionarioCamposEscala,
} from "@/components/funcionario-campos-escala";
import { SelectPesquisavel } from "@/components/select-pesquisavel";
import { CampoCargo } from "@/components/campo-cargo";

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
    cargoId: "",
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
        cargoId: form.cargoId ? Number(form.cargoId) : undefined,
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

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo obrigatorio dica="Somente números, 11 dígitos.">CPF</Rotulo>
        <input
          required
          inputMode="numeric"
          maxLength={11}
          placeholder="Ex.: 39284105714"
          value={form.cpf}
          onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, "") })}
          className={inputClass}
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
        <Rotulo opcional dica="Só uma etiqueta do que a pessoa faz. Não altera a escala. Se não estiver na lista, digite e clique em “+ Cadastrar”.">
          Cargo
        </Rotulo>
        <CampoCargo
          value={form.cargoId}
          onChange={(cargoId) => setForm({ ...form, cargoId })}
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
        <SelectPesquisavel
          value={form.postoId}
          vazio="Sem posto definido"
          aria-label="Posto de trabalho"
          opcoes={postos.map((p) => ({
            valor: String(p.id),
            rotulo: p.nome,
            detalhe: [p.empresa?.nome, p.localizacao].filter(Boolean).join(" — "),
          }))}
          onChange={(novoPostoId) => {
            // Trocar de posto zera turno de casa e habilitações: elas
            // apontam pra turnos do posto anterior. Coringa já vem
            // habilitado em toda a grade do posto NOVO (mesma regra de
            // marcar a caixa de coringa).
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
        />
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
