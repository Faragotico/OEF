import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Valida que horaFim é depois de horaInicio.
// Como o formato é "HH:MM", comparar as strings direto já funciona.
@ValidatorConstraint({ name: 'horaFimDepois', async: false })
class HoraFimDepoisConstraint implements ValidatorConstraintInterface {
  validate(horaFim: string, args: ValidationArguments) {
    const horaInicio = (args.object as Record<string, unknown>)[
      args.constraints[0] as string
    ];
    // Num PATCH parcial (ex: só { horaFim: "10:00" }), horaInicio pode
    // não vir no corpo. Aqui não dá pra saber o valor já salvo, então
    // não reprovamos — quem compara nesse caso é o TurnoService.update,
    // que busca o registro existente antes de validar.
    if (horaInicio === undefined) return true;
    return typeof horaFim === 'string' && horaFim > (horaInicio as string);
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

  /**
   * Posto a que este turno pertence.
   *
   * É o que transforma um turno solto na GRADE DE HORÁRIOS de um lugar:
   * a geração automática monta a escala a partir dos turnos do posto,
   * não mais a partir dos horários das pessoas. Isso é o que permite
   * existir um turno que ninguém tem como horário de casa — o 10–18 da
   * escala real da Matriz, coberto só por quem estiver sobrando.
   *
   * Opcional porque o "horário personalizado" da tela de Alocação cria
   * turnos avulsos, que não pertencem a posto nenhum.
   */
  @IsOptional()
  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive({ message: 'postoId deve ser um número positivo.' })
  postoId?: number;

  /**
   * Em que dias da semana este turno abre, do domingo (índice 0) ao
   * sábado (índice 6): 1 = abre, 0 = fechado.
   *
   * Não é "quantas pessoas" — pra cobrir um horário de pico (ex:
   * 11h–14h com mais gente que o normal), cadastra-se outro turno com
   * horário próprio que se sobrepõe a este, não se aumenta este número.
   * Isso é o que faz o sistema representar domingo e feriado com meia
   * equipe: como a folga é o RESÍDUO da demanda, fechar o turno no
   * domingo é o jeito mais direto de dar domingo de folga pra mais
   * gente — sem nenhuma regra nova.
   *
   * Se não vier, o turno abre todos os dias, que é o comportamento que
   * o sistema sempre teve.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7, { message: 'demandaPorDiaDaSemana deve ter 7 posições (domingo a sábado).' })
  @ArrayMaxSize(7, { message: 'demandaPorDiaDaSemana deve ter 7 posições (domingo a sábado).' })
  @IsInt({ each: true, message: 'demandaPorDiaDaSemana deve conter apenas inteiros.' })
  @Min(0, { each: true, message: 'Cada dia é 0 (não existe) ou 1 (existe).' })
  @Max(1, { each: true, message: 'Cada dia é 0 (não existe) ou 1 (existe) — não é mais "quantidade".' })
  demandaPorDiaDaSemana?: number[];
}
