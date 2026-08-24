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

    // Em um PATCH parcial (ex: só { horaFim: "10:00" }), horaInicio pode
    // não vir no corpo da requisição. Aqui não temos como saber o valor
    // já salvo no banco, então não reprovamos por conta disso — quem faz
    // essa comparação nesse caso é o TurnoService.update, que busca o
    // registro existente antes de validar. Sem este `if`, todo PATCH que
    // mexesse só em horaFim (ou só em horaInicio) seria recusado à toa,
    // mesmo sendo uma atualização legítima.
    if (horaInicio === undefined) return true;

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
