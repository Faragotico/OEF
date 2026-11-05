import type { ReactNode } from "react";

// Caixa única pra erro, aviso, informação e "tudo certo" — todas as
// mensagens do sistema usam esta, pra ter o mesmo visual em qualquer
// tela. Sem `children`, é uma linha só. Com `children`, a linha vira o
// título e o detalhe abre ao clicar (ou já vem aberto com `aberto`).
export type NivelAviso = "erro" | "aviso" | "info" | "ok";

const ESTILO: Record<NivelAviso, string> = {
  erro: "bg-danger text-white",
  aviso: "border border-warning/20 bg-warning/10 text-warning",
  info: "border border-border bg-text/5 text-text-secondary",
  ok: "border border-success/20 bg-success/10 text-success",
};

export function Aviso({
  nivel,
  titulo,
  aberto = false,
  children,
}: {
  nivel: NivelAviso;
  titulo: ReactNode;
  aberto?: boolean;
  children?: ReactNode;
}) {
  const base = `rounded-lg px-3 py-2 text-sm ${ESTILO[nivel]}`;

  if (!children) {
    return (
      <p className={`${base} font-medium`} role={nivel === "erro" ? "alert" : undefined}>
        {titulo}
      </p>
    );
  }

  return (
    <details className={base} open={aberto}>
      <summary className="cursor-pointer font-medium">{titulo}</summary>
      <div className="mt-2 text-[13px] leading-snug">{children}</div>
    </details>
  );
}
