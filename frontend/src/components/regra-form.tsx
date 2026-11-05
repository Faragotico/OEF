"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";
import { Rotulo } from "@/components/rotulo";
import { Aviso } from "@/components/aviso";

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-text";

// Os únicos quatro tipos que o motor de geração/validação de escala
// (RegrasTrabalhistasService, GeracaoEscalaService) realmente lê —
// mesma lista do CreateRegraDto no backend. Antes deste rework a tela
// aceitava qualquer texto e sugeria mais dois tipos que nunca tiveram
// efeito nenhum; agora só dá pra cadastrar o que de fato muda alguma
// coisa na geração/validação, e cada um explica o que é.
const TIPOS = [
  {
    chave: "escala",
    label: "Padrão de rodízio da escala",
    ajuda:
      "Quantos dias a pessoa trabalha antes de folgar (ex.: 5x1). Os dois números são em dias e o máximo trabalhado é 6. Você escolhe qual padrão usar em cada geração. Plantão em horas (12x36) não é suportado.",
    valorPadrao: "5x1",
  },
  {
    chave: "carga_horaria_semanal",
    label: "Carga horária semanal máxima",
    ajuda:
      "Máximo de horas de segunda a domingo (CLT: 44h). Só cadastre se quiser outro valor; sem ela o sistema já usa 44h.",
    valorPadrao: "44",
  },
  {
    chave: "intervalo_interjornada",
    label: "Intervalo mínimo entre jornadas",
    ajuda:
      "Descanso mínimo, em horas, entre um turno e o próximo (CLT: 11h). Só cadastre se quiser outro valor; sem ela o sistema já usa 11h.",
    valorPadrao: "11",
  },
  {
    chave: "intervalo_intrajornada",
    label: "Intervalo intrajornada (pausa dentro do turno)",
    ajuda:
      "Pausa dentro do turno (ex.: 1h de almoço), descontada das horas trabalhadas. Só cadastre se quiser outro valor; sem ela o sistema já desconta 1h.",
    valorPadrao: "1",
  },
] as const;

type TipoRegra = (typeof TIPOS)[number]["chave"];

type ValoresRegra = {
  descricao: string;
  tipo: TipoRegra;
  valor: string;
};

export function RegraForm({
  id,
  valoresIniciais,
  onSalvo,
}: {
  id?: number;
  valoresIniciais?: ValoresRegra;
  onSalvo?: () => void;
}) {
  const router = useRouter();
  const modoEdicao = id !== undefined;
  const [form, setForm] = useState<ValoresRegra>(
    valoresIniciais ?? { descricao: "", tipo: "escala", valor: "5x1" },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tipoAtual = TIPOS.find((t) => t.chave === form.tipo) ?? TIPOS[0];

  // Trocar de tipo troca o formato esperado do valor — mantém o valor
  // antigo aqui não faz sentido (um "5x1" não quer dizer nada pra
  // "carga horária semanal"), então reseta pro padrão do tipo novo.
  function handleTipoChange(novoTipo: TipoRegra) {
    const tipo = TIPOS.find((t) => t.chave === novoTipo) ?? TIPOS[0];
    setForm({ ...form, tipo: tipo.chave, valor: tipo.valorPadrao });
  }

  // Só usado quando tipo === "escala": os dois números do "NxM".
  const matchCiclo = form.valor.match(/^(\d+)x(\d+)$/);
  const diasTrabalho = matchCiclo ? matchCiclo[1] : "";
  const diasDescanso = matchCiclo ? matchCiclo[2] : "";

  function handleCicloChange(trabalho: string, descanso: string) {
    setForm({ ...form, valor: `${trabalho || 0}x${descanso || 0}` });
  }

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
      if (onSalvo) {
        onSalvo();
      } else {
        router.push("/regras");
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
        <Rotulo obrigatorio>Descrição</Rotulo>
        <input
          required
          minLength={3}
          maxLength={500}
          placeholder='Ex: "Escala padrão 5x1", "Limite de 44h semanais"'
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-text">
        <Rotulo obrigatorio dica={tipoAtual.ajuda}>
          Tipo de regra
        </Rotulo>
        <select
          required
          value={form.tipo}
          onChange={(e) => handleTipoChange(e.target.value as TipoRegra)}
          className={inputClass}
        >
          {TIPOS.map((t) => (
            <option key={t.chave} value={t.chave}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {form.tipo === "escala" ? (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-text">
            <Rotulo obrigatorio>Dias trabalhados</Rotulo>
            <input
              type="number"
              required
              min={1}
              max={6}
              placeholder="Ex: 5"
              value={diasTrabalho}
              onChange={(e) => handleCicloChange(e.target.value, diasDescanso)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text">
            <Rotulo obrigatorio>Dias de folga</Rotulo>
            <input
              type="number"
              required
              min={1}
              max={7}
              placeholder="Ex: 1"
              value={diasDescanso}
              onChange={(e) => handleCicloChange(diasTrabalho, e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-text">
          <Rotulo obrigatorio>Valor (horas)</Rotulo>
          <input
            type="number"
            required
            min={1}
            max={168}
            placeholder="Ex: 44"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            className={inputClass}
          />
        </label>
      )}

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
