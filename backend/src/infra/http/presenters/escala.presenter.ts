import { Escala } from '@prisma/client';
import { formatDate } from 'src/helpers/date.helpers';

// O presenter é o espelho do DTO: o DTO valida o que ENTRA, o presenter
// formata o que SAI. Nada de regra de negócio aqui — só tradução de
// formato (Date -> "AAAA-MM-DD").
export class EscalaPresenter {
  static toHTTP(escala: Escala) {
    return {
      ...escala,
      dataInic: formatDate(escala.dataInic),
      dataFim: formatDate(escala.dataFim),
    };
  }
}
