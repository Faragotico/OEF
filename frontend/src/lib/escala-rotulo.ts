// Nome de exibição da escala — par de backend/src/helpers/escala.helpers.ts
// (não há código compartilhado entre front e back). Se um mudar, o
// outro tem que acompanhar: título da tela e nome do PDF baixado
// precisam ser a mesma frase.

type EscalaComPosto = {
  posto?: { nome: string } | null;
  dataInic: string;
  dataFim: string;
};

/** "2026-04-01" -> "01-04-26". Dia-mês-ano curto, como no quadro de papel. */
export function formatDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}-${mes}-${ano.slice(2)}`;
}

/** Ex: "Matriz 01-04-26 a 30-04-26". */
export function rotuloEscala(escala: EscalaComPosto): string {
  const posto = escala.posto?.nome?.trim() || "Escala";
  return `${posto} ${formatDataCurta(escala.dataInic)} a ${formatDataCurta(escala.dataFim)}`;
}
