import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Valida que dataFim não é anterior a dataInicio (mesmo padrão do
// HoraFimDepoisConstraint do CreateTurnoDto, adaptado pra data).
@ValidatorConstraint({ name: 'dataFimNaoAnterior', async: false })
class DataFimNaoAnteriorConstraint implements ValidatorConstraintInterface {
  validate(dataFim: string, args: ValidationArguments) {
    const dataInicio = (args.object as any)[args.constraints[0]];
    return (
      typeof dataFim === 'string' &&
      typeof dataInicio === 'string' &&
      dataFim >= dataInicio
    );
  }
  defaultMessage() {
    return 'dataFim deve ser igual ou posterior a dataInicio.';
  }
}

// DTO de criação de uma Ausência — RN02 (o motor de geração/validação
// de escala nunca aloca um funcionário durante o período aqui
// registrado). Sem esta tela/rota, a RN02 existia no motor mas
// ninguém conseguia de fato cadastrar uma ausência pelo sistema.
export class CreateAusenciaDto {
  @IsInt({ message: 'funcionarioId deve ser um número inteiro.' })
  @IsPositive({ message: 'funcionarioId deve ser um número positivo.' })
  funcionarioId: number;

  @IsDateString(
    {},
    { message: 'dataInicio deve ser uma data válida (AAAA-MM-DD).' },
  )
  dataInicio: string;

  @IsDateString(
    {},
    { message: 'dataFim deve ser uma data válida (AAAA-MM-DD).' },
  )
  @Validate(DataFimNaoAnteriorConstraint, ['dataInicio'])
  dataFim: string;

  @IsString()
  @MinLength(3, { message: 'O motivo deve ter ao menos 3 caracteres.' })
  @MaxLength(200, { message: 'O motivo deve ter no máximo 200 caracteres.' })
  motivo: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'A compensação deve ter no máximo 200 caracteres.' })
  compensacao?: string;
}
