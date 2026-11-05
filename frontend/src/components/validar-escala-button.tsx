"use client";

import { useState, type ReactNode } from "react";
import { apiGet } from "@/lib/api";
import {
  descreverViolacoes,
  type Diagnostico,
  type ViolacaoApi,
} from "@/lib/diagnosticos";
import { CartaoDiagnostico, ORDEM_NIVEL } from "@/components/cartao-diagnostico";
import { Aviso } from "@/components/aviso";

type ResultadoValidacao = {
  escalaId: number;
  totalAlocacoes: number;
  valida: boolean;
  violacoes: ViolacaoApi[];
  // Conferências além das regras trabalhistas (domingo de folga, vagas
  // sem ninguém...) — as mesmas que a geração mostra.
  diagnosticos: Diagnostico[];
};

// Agrupa por funcionário e converte cada grupo em frases (ver
// descreverViolacoes) — "6 violações" viram os 2 problemas de verdade.
function agrupar(violacoes: ViolacaoApi[]) {
  const porFuncionario = new Map<number, { nome: string; lista: ViolacaoApi[] }>();
  for (const v of violacoes) {
    const grupo = porFuncionario.get(v.funcionarioId) ?? {
      nome: v.funcionario,
      lista: [],
    };
    grupo.lista.push(v);
    porFuncionario.set(v.funcionarioId, grupo);
  }
  return [...porFuncionario].map(([id, g]) => ({
    id,
    nome: g.nome,
    frases: descreverViolacoes(g.lista),
  }));
}

// UC06 "Validar Escala" — revalida cada alocação já salva contra as
// mesmas regras (RN01-RN07) usadas na geração. Útil depois de qualquer
// edição manual (substituição, troca de turno) feita fora do motor.
//
// Devolve um fragmento: o grupo de botões (o que a página passar em
// `children` + "Validar escala") e, embaixo, o resultado ocupando a
// linha toda — o container da página precisa ser `flex flex-wrap`.
export function ValidarEscalaButton({
  escalaId,
  children,
}: {
  escalaId: number;
  children?: ReactNode;
}) {
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

  const grupos = resultado ? agrupar(resultado.violacoes) : [];
  const totalProblemas = grupos.reduce((soma, g) => soma + g.frases.length, 0);

  return (
    <>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={validar}
          disabled={loading}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-text/5 disabled:opacity-50"
        >
          {loading ? "Validando..." : "Validar escala"}
        </button>
      </div>

      {error && (
        <div className="basis-full">
          <Aviso nivel="erro" titulo={error} />
        </div>
      )}

      {resultado && (
        <div className="flex basis-full flex-col gap-2">
          {resultado.valida ? (
            <Aviso
              nivel="ok"
              titulo={
                resultado.diagnosticos.length === 0
                  ? `Escala válida — ${resultado.totalAlocacoes} alocações conferidas, nenhum problema.`
                  : `Regras trabalhistas em dia — ${resultado.totalAlocacoes} alocações conferidas.`
              }
            />
          ) : (
            <Aviso
              nivel="aviso"
              aberto
              titulo={`${totalProblemas} ${totalProblemas === 1 ? "problema" : "problemas"} nas regras trabalhistas`}
            >
              <ul className="flex flex-col gap-2">
                {grupos.map((g) => (
                  <li key={g.id}>
                    <span className="font-semibold">{g.nome}</span>
                    <ul className="ml-4 list-disc">
                      {g.frases.map((frase) => (
                        <li key={frase}>{frase}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Aviso>
          )}

          {[...resultado.diagnosticos]
            .sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel])
            .map((d, i) => (
              <CartaoDiagnostico key={`${d.codigo}-${i}`} diagnostico={d} />
            ))}
        </div>
      )}
    </>
  );
}
