import { Aviso } from "@/components/aviso";
import { type Diagnostico, traduzir } from "@/lib/diagnosticos";

// Um diagnóstico por linha, com a gravidade na cor. O título fica sempre
// visível; o detalhe e o "o que fazer" abrem ao clicar (erro já vem
// aberto, porque trava a geração e pede ação). Usado na geração e na
// validação da escala — mesma frase nos dois lugares.
export const ORDEM_NIVEL = { erro: 0, aviso: 1, info: 2 } as const;

export function CartaoDiagnostico({ diagnostico }: { diagnostico: Diagnostico }) {
  const { nivel, titulo, detalhe, acao } = traduzir(diagnostico);
  return (
    <Aviso nivel={nivel} titulo={titulo} aberto={nivel === "erro"}>
      <p>{detalhe}</p>
      {acao && (
        <p className="mt-1.5 font-medium">
          <span className="uppercase tracking-wide opacity-70">o que fazer: </span>
          {acao}
        </p>
      )}
    </Aviso>
  );
}
