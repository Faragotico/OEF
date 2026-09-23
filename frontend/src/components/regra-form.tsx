"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/api";

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
      "Quantos dias o funcionário trabalha antes de folgar (ex: 5 dias trabalhados x 1 de folga). É a regra que você escolhe ao gerar uma escala automática — pode cadastrar mais de uma (5x1, 6x1...) e escolher qual usar em cada geração. Os dois números são em DIAS, e o máximo de dias trabalhados é 6: o descanso semanal (RN07) não permite mais que isso sem folga. Plantão em horas (12x36) não é suportado.",
    valorPadrao: "5x1",
  },
  {
    chave: "carga_horaria_semanal",
    label: "Carga horária semanal máxima",
    ajuda:
      'Limite de horas que um funcionário pode trabalhar de segunda a domingo (CLT: 44h). Vale pro sistema inteiro, sem precisar escolher em lugar nenhum. Só cadastre esta regra se quiser um valor diferente de 44 — sem ela, o sistema já usa 44h.',
    valorPadrao: "44",
  },
  {
    chave: "intervalo_interjornada",
    label: "Intervalo mínimo entre jornadas",
    ajuda:
      "Descanso mínimo, em horas, entre o fim de um turno e o início do próximo (CLT: 11h). Vale pro sistema inteiro, sem precisar escolher em lugar nenhum. Só cadastre esta regra se quiser um valor diferente de 11 — sem ela, o sistema já usa 11h.",
    valorPadrao: "11",
  },
  {
    chave: "intervalo_intrajornada",
    label: "Intervalo intrajornada (pausa dentro do turno)",
    ajuda:
      "Pausa dentro do turno (ex: 1h de almoço num turno de 8h) que não conta como hora trabalhada — é descontada do total de horas antes de checar o limite semanal e em qualquer total de horas exibido. Vale pro sistema inteiro, sem precisar escolher em lugar nenhum. Só cadastre esta regra se quiser um valor diferente de 1h — sem ela, o sistema já desconta 1h por turno.",
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
        Descrição
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
        Tipo de regra
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
      <p className="-mt-2 rounded-lg border border-border bg-text/5 px-3 py-2 text-xs text-text-secondary">
        {tipoAtual.ajuda}
      </p>

      {form.tipo === "escala" ? (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-text">
            Dias trabalhados
            <input
              type="number"
              required
              min={1}
              max={6}
              value={diasTrabalho}
              onChange={(e) => handleCicloChange(e.target.value, diasDescanso)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text">
            Dias de folga
            <input
              type="number"
              required
              min={1}
              max={7}
              value={diasDescanso}
              onChange={(e) => handleCicloChange(diasTrabalho, e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-text">
          Valor (horas)
          <input
            type="number"
            required
            min={1}
            max={168}
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            className={inputClass}
          />
        </label>
      )}

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
