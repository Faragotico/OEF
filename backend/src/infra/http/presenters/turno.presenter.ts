import { PostoTrabalho, Turno, TurnoDemanda } from '@prisma/client';
import { formatTime } from 'src/helpers/date.helpers';

// Turno sem demanda cadastrada pede uma pessoa todo dia — mesmo padrão
// que o motor de geração assume, escrito num lugar só de cada lado.
const DEMANDA_PADRAO = [1, 1, 1, 1, 1, 1, 1];

// O presenter é o espelho do DTO: o DTO valida o que ENTRA,
// o presenter formata o que SAI. Nada de regra de negócio aqui —
// só tradução de formato.
export class TurnoPresenter {
  // `static` = chama direto na classe (TurnoPresenter.toHTTP(x)),
  // sem precisar criar um objeto antes. Faz sentido porque ele não
  // guarda nada, só transforma.
  static toHTTP(
    turno: Turno & { posto?: PostoTrabalho | null; demandas?: TurnoDemanda[] },
  ) {
    return {
      ...turno,
      // O Prisma devolve @db.Time como Date ("1970-01-01T06:00:00.000Z").
      // formatTime corta só a hora: "06:00".
      horaInicio: formatTime(turno.horaInicio),
      horaFim: formatTime(turno.horaFim),
      posto: turno.posto ?? null,
      // A demanda sai como um vetor de 7 posições (domingo a sábado),
      // que é como a tela edita e como o motor consome — bem mais fácil
      // de ler do que sete linhas com um dia em cada.
      demandaPorDiaDaSemana: turno.demandas
        ? Array.from(
            { length: 7 },
            (_, diaSemana) =>
              turno.demandas!.find((d) => d.diaSemana === diaSemana)?.quantidade ?? 1,
          )
        : DEMANDA_PADRAO,
    };
  }
}
