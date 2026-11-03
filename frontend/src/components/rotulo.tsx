// Texto de rótulo de campo de formulário, com a marca de obrigatório
// (* vermelho) ou de opcional ("(opcional)" em cinza). Vai dentro de um
// <span> próprio porque o <label> dos formulários é flex-col: sem isso
// o asterisco cairia numa linha separada do texto.
//
// O asterisco é só visual (aria-hidden): quem usa leitor de tela já é
// avisado pelo atributo `required` do próprio campo.
export function Rotulo({
  children,
  obrigatorio,
  opcional,
}: {
  children: React.ReactNode;
  obrigatorio?: boolean;
  opcional?: boolean;
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
    </span>
  );
}
