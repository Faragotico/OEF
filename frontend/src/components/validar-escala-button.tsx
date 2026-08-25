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
        className="self-start border-2 border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-black shadow-[4px_4px_0_0_#000] transition-all hover:bg-red-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 dark:bg-zinc-900 dark:text-white"
      >
        {loading ? "Validando..." : "Validar escala"}
      </button>

      {error && (
        <p className="border-2 border-black bg-red-600 px-3 py-2 text-sm font-medium text-white">
          {error}
        </p>
      )}

      {resultado && (
        <div
          className={
            resultado.valida
              ? "border-2 border-black bg-red-100 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100"
              : "border-2 border-black bg-red-600 px-4 py-3 text-sm font-medium text-white"
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
