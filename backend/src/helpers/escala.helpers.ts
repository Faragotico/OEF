import { formatDate } from './date.helpers';

// Nome de exibição da escala (posto + período): tela, cabeçalho do PDF
// e nome do arquivo usam a mesma frase, pra nunca divergir. O id
// continua sendo a chave; isto aqui é só o rótulo.

type EscalaComPosto = {
  posto?: { nome: string } | null;
  dataInic: Date;
  dataFim: Date;
};

/** "2026-04-01" -> "01-04-26". Dia-mês-ano curto, como no quadro de papel. */
export function formatDataCurta(data: Date): string {
  const [ano, mes, dia] = formatDate(data).split('-');
  return `${dia}-${mes}-${ano.slice(2)}`;
}

/** Ex: "Matriz 01-04-26 a 30-04-26". */
export function rotuloEscala(escala: EscalaComPosto): string {
  const posto = escala.posto?.nome?.trim() || 'Escala';
  return `${posto} ${formatDataCurta(escala.dataInic)} a ${formatDataCurta(escala.dataFim)}`;
}

/** O rótulo, seguro para Content-Disposition e nome de arquivo: sem acento, sem aspas, sem caractere que o Windows recusa. */
export function nomeArquivoEscala(escala: EscalaComPosto): string {
  const seguro = rotuloEscala(escala)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 \-_.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${seguro || 'escala'}.pdf`;
}
