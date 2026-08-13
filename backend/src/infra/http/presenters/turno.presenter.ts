import { Turno } from '@prisma/client';
import { formatTime } from 'src/helpers/date.helpers';

// O presenter é o espelho do DTO: o DTO valida o que ENTRA,
// o presenter formata o que SAI. Nada de regra de negócio aqui —
// só tradução de formato.
export class TurnoPresenter {
  // `static` = chama direto na classe (TurnoPresenter.toHTTP(x)),
  // sem precisar criar um objeto antes. Faz sentido porque ele não
  // guarda nada, só transforma.
  static toHTTP(turno: Turno) {
    return {
      ...turno,
      // O Prisma devolve @db.Time como Date ("1970-01-01T06:00:00.000Z").
      // formatTime corta só a hora: "06:00".
      horaInicio: formatTime(turno.horaInicio),
      horaFim: formatTime(turno.horaFim),
    };
  }
}
