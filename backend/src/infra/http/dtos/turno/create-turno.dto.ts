import { IsOptional, IsString, MaxLength, Matches, Validate } from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Valida que horaFim é depois de horaInicio.
// Como o formato é "HH:MM", comparar as strings direto já funciona.
@ValidatorConstraint({ name: 'horaFimDepois', async: false })
class HoraFimDepoisConstraint implements ValidatorConstraintInterface {
  validate(horaFim: string, args: ValidationArguments) {
    const horaInicio = (args.object as any)[args.constraints[0]];
    return typeof horaFim === 'string' && horaFim > horaInicio;
  }
  defaultMessage() {
    return 'horaFim deve ser posterior a horaInicio.';
  }
}

export class CreateTurnoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'A descrição deve ter no máximo 100 caracteres.' })
  descricao?: string;

  // Recebe texto "HH:MM" (ex: "06:00"). @Matches garante o formato.
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaInicio deve estar no formato HH:MM.',
  })
  horaInicio: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaFim deve estar no formato HH:MM.',
  })
  @Validate(HoraFimDepoisConstraint, ['horaInicio'])
  horaFim: string;
}