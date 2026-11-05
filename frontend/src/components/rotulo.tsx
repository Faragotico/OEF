// Texto de rótulo de campo de formulário, com a marca de obrigatório
// (* vermelho) ou de opcional ("(opcional)" em cinza). Vai dentro de um
// <span> próprio porque o <label> dos formulários é flex-col: sem isso
// o asterisco cairia numa linha separada do texto.
//
// O asterisco é só visual (aria-hidden): quem usa leitor de tela já é
// avisado pelo atributo `required` do próprio campo.
import { Dica } from "@/components/dica";

export function Rotulo({
  children,
  obrigatorio,
  opcional,
  dica,
}: {
  children: React.ReactNode;
  obrigatorio?: boolean;
  opcional?: boolean;
  /** Dica curta num "?" ao lado do rótulo (balão ao passar o mouse / clicar). */
  dica?: React.ReactNode;
}) {
  return (
    <span>
      {children}
      {obrigatorio && (
        <span className="ml-0.5 font-semibold text-danger" aria-hidden="true">
          *
        </span>
      )}
      {opcional && (
        <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
          (opcional)
        </span>
      )}
      {dica && <Dica>{dica}</Dica>}
    </span>
  );
}
