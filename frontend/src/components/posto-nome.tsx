import type { PostoComEmpresa } from "@/lib/posto-rotulo";

// Nome do posto com a empresa embaixo, em cinza — pra células de tabela.
export function PostoNome({ posto }: { posto: PostoComEmpresa }) {
  return (
    <>
      <span>{posto.nome}</span>
      {posto.empresa?.nome && (
        <span className="block text-xs text-text-secondary">{posto.empresa.nome}</span>
      )}
    </>
  );
}
