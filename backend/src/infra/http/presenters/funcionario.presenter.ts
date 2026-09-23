import { Funcionario, PostoTrabalho, Turno } from '@prisma/client';
import { TurnoPresenter } from './turno.presenter';

// O presenter é o espelho do DTO: o DTO valida o que ENTRA, o
// presenter formata o que SAI. Nada de regra de negócio aqui — só
// tradução de formato.
//
// `coringa` deixou de ser coluna do banco e passa a ser calculado aqui.
// A definição é a mesma que a tela sempre usou — "funcionário sem
// horário de casa, que cobre o turno de quem está de folga" — só que
// agora ela é DERIVADA do cadastro em vez de ser um segundo campo que
// podia contradizer o primeiro:
//
//   sem turno padrão + com habilitação  -> coringa
//   sem turno padrão + sem habilitação  -> cadastro incompleto
//
// A distinção importa: antes, um funcionário que o gestor tinha
// esquecido de completar era indistinguível de um coringa de verdade.
export class FuncionarioPresenter {
  static toHTTP(
    funcionario: Funcionario & {
      turnoPadrao?: Turno | null;
      posto?: PostoTrabalho | null;
      habilitacoes?: { turnoId: number }[];
    },
  ) {
    const habilitacoes = funcionario.habilitacoes ?? [];
    return {
      ...funcionario,
      turnoPadrao: funcionario.turnoPadrao
        ? TurnoPresenter.toHTTP(funcionario.turnoPadrao)
        : null,
      posto: funcionario.posto ?? null,
      turnosHabilitadosIds: habilitacoes.map((h) => h.turnoId),
      coringa: funcionario.turnoPadraoId === null && habilitacoes.length > 0,
      cadastroIncompleto:
        funcionario.turnoPadraoId === null && habilitacoes.length === 0,
    };
  }
}
