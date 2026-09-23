"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api";

type ResultadoValidacao = {
  escalaId: number;
  totalAlocacoes: number;
  valida: boolean;
  violacoes: Array<{ alocacaoId: number; regra: string; motivo: string }>;
};

// UC06 "Validar Escala" — revalida cada alocação já salva contra as
// mesmas regras (RN01-RN07) usadas na geração. Útil depois de qualquer
// edição manual (substituição, troca de turno) feita fora do motor.
export function ValidarEscalaButton({ escalaId }: { escalaId: number }) {
  const [resultado, setResultado] = useState<ResultadoValidacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function validar() {
    setLoading(true);
    setError(null);
    try {
      const resposta = await apiGet<ResultadoValidacao>(
        `/escalas/${escalaId}/validar`,
      );
      setResultado(resposta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={validar}
        disabled={loading}
        className="self-start rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-text/5 disabled:opacity-50"
      >
        {loading ? "Validando..." : "Validar escala"}
      </button>

      {error && (
        <p className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      {resultado && (
        <div
          className={
            resultado.valida
              ? "rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success"
              : "rounded-lg bg-danger px-4 py-3 text-sm font-medium text-white"
          }
        >
          {resultado.valida ? (
            <span>
              Escala válida — {resultado.totalAlocacoes} alocação(ões)
              conferida(s), nenhuma violação.
            </span>
          ) : (
            <div className="flex flex-col gap-1">
              <span>
                {resultado.violacoes.length} violação(ões) encontrada(s):
              </span>
              <ul className="list-inside list-disc">
                {resultado.violacoes.map((v) => (
                  <li key={v.alocacaoId}>
                    Alocação #{v.alocacaoId} ({v.regra}): {v.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
