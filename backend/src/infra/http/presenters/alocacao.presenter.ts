import { Alocacao } from '@prisma/client';
import { formatDate } from 'src/helpers/date.helpers';

// O presenter é o espelho do DTO: o DTO valida o que ENTRA,
// o presenter formata o que SAI. Nada de regra de negócio aqui —
// só tradução de formato.
export class AlocacaoPresenter {
  // `static` = chama direto na classe (AlocacaoPresenter.toHTTP(x)),
  // sem precisar criar um objeto antes. Faz sentido porque ele não
  // guarda nada, só transforma.
  static toHTTP(alocacao: Alocacao) {
    return {
      ...alocacao,
      data: formatDate(alocacao.data),
    };
  }
}