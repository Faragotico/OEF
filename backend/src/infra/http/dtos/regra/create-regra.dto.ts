import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Os únicos quatro tipos que o motor de geração/validação de escala
// (RegrasTrabalhistasService, GeracaoEscalaService) realmente lê:
//   'escala'                 -> padrão de rodízio da escala (RN06)
//   'carga_horaria_semanal'  -> limite semanal de horas (RN04)
//   'intervalo_interjornada' -> descanso mínimo ENTRE turnos, dia
//                                seguinte (RN05)
//   'intervalo_intrajornada' -> pausa DENTRO do turno (ex: 1h de
//                                almoço num turno de 8h) — descontada
//                                das horas efetivamente trabalhadas
//                                antes de somar no RN04 e em qualquer
//                                total de horas exibido (PDF, grade)
// Um tipo fora desta lista nunca tem efeito nenhum no motor.
// 'intervalo_intrajornada' e 'descanso_semanal' já estiveram na tela
// antes deste rework sem o motor ler nenhum dos dois — descanso_semanal
// continua de fora (RN07 já garante o DSR fixo em 6 dias, não é
// configurável), mas intervalo_intrajornada agora É lido de verdade
// (ver RegrasTrabalhistasService).
export const TIPOS_REGRA = [
  'escala',
  'carga_horaria_semanal',
  'intervalo_interjornada',
  'intervalo_intrajornada',
] as const;

export type TipoRegra = (typeof TIPOS_REGRA)[number];

// O formato de "valor" depende do tipo: "NxM" (em DIAS) pro padrão de
// rodízio (ex: "5x1"), um número puro de horas pros outros. Validamos
// isso aqui, não só na tela — a API não aceita um valor fora do
// formato mesmo que alguém chame direto, sem passar pelo formulário.
@ValidatorConstraint({ name: 'valorRegraValido', async: false })
class ValorRegraValidoConstraint implements ValidatorConstraintInterface {
  validate(valor: string, args: ValidationArguments) {
    const tipo = (args.object as { tipo?: string }).tipo;
    if (typeof valor !== 'string') return false;
    if (tipo === 'escala') {
      const partes = /^(\d+)x(\d+)$/.exec(valor);
      if (!partes) return false;
      const trabalho = Number(partes[1]);
      const descanso = Number(partes[2]);
      // Os dois números são DIAS. O limite de 6 dias de trabalho não é
      // arbitrário: o RN07 (Descanso Semanal Remunerado) proíbe passar
      // de 6 dias seguidos sem folga, então "7x1" ou "12x36" nunca
      // seriam cumpríveis — o motor montaria um rodízio que o próprio
      // validador barra em seguida, dia por dia, e a escala sairia
      // praticamente vazia (foi o que acontecia com "12x36", que é
      // notação de plantão em HORAS e não em dias).
      return trabalho >= 1 && trabalho <= 6 && descanso >= 1 && descanso <= 7;
    }
    if (!/^\d+$/.test(valor)) return false;
    const horas = Number(valor);
    return horas >= 1 && horas <= 168;
  }
  defaultMessage(args: ValidationArguments) {
    const tipo = (args.object as { tipo?: string }).tipo;
    return tipo === 'escala'
      ? 'Pra tipo "escala", o valor deve estar no formato N x M em DIAS, com N de 1 a 6 e M de 1 a 7 (ex: 5x1, 6x1). Plantão em horas (ex: 12x36) não é suportado: o descanso semanal (RN07) impede mais de 6 dias seguidos de trabalho.'
      : 'Pra este tipo, o valor deve ser um número inteiro de horas entre 1 e 168 (ex: 44).';
  }
}

// DTO de criação da Regra.
// Campos e limites vieram do Dicionário de Dados:
//   descricao VARCHAR(500) NOT NULL
//   tipo      VARCHAR(50)  NOT NULL
//   valor     VARCHAR(50)  NOT NULL
export class CreateRegraDto {
  @IsString()
  @MinLength(3, { message: 'A descrição deve ter ao menos 3 caracteres.' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres.' })
  descricao: string;

  @IsIn(TIPOS_REGRA, {
    message: `tipo deve ser um dos seguintes: ${TIPOS_REGRA.join(', ')}.`,
  })
  tipo: TipoRegra;

  @IsString()
  @MaxLength(50, { message: 'O valor deve ter no máximo 50 caracteres.' })
  @Validate(ValorRegraValidoConstraint)
  valor: string;
}
