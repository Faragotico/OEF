import { Funcionario, Turno } from '@prisma/client';
import { TurnoPresenter } from './turno.presenter';

// O presenter é o espelho do DTO: o DTO valida o que ENTRA, o
// presenter formata o que SAI. Nada de regra de negócio aqui — só
// tradução de formato.
//
// Passou a existir porque o Funcionario agora pode trazer o
// turnoPadrao junto (include no repository) — sem formatar, o
// horaInicio/horaFim daquele turno viriam como Date cru
// ("1970-01-01T07:45:00.000Z") em vez de "07:45", igual já acontece
// em qualquer outro lugar que devolve um Turno pela API.
export class FuncionarioPresenter {
  static toHTTP(funcionario: Funcionario & { turnoPadrao?: Turno | null }) {
    return {
      ...funcionario,
      turnoPadrao: funcionario.turnoPadrao
        ? TurnoPresenter.toHTTP(funcionario.turnoPadrao)
        : null,
    };
  }
}
