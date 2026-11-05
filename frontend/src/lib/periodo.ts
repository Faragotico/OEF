// Datas como "AAAA-MM-DD" a partir das partes LOCAIS do Date. Não usa
// toISOString() de propósito: ele converte pra UTC e, à noite no Brasil,
// já cairia no dia seguinte.
function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Primeiro e último dia do mês atual — o período padrão das listas
// que filtram por data (ausências, escalas, alocações).
export function mesAtual(): { inicio: string; fim: string } {
  const hoje = new Date();
  return {
    inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    fim: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
}
