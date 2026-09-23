import { IsDateString, IsInt, IsPositive } from 'class-validator';

// DTO de criação manual de uma Escala (período + posto + regra).
// Normalmente uma escala nasce junto com a geração automática
// (POST /escalas/gerar-automatica), mas este endpoint existe pra
// permitir criar uma escala "vazia" e alocar manualmente depois.
export class CreateEscalaDto {
  @IsDateString(
    {},
    { message: 'dataInicio deve ser uma data válida (AAAA-MM-DD).' },
  )
  dataInicio: string;

  @IsDateString(
    {},
    { message: 'dataFim deve ser uma data válida (AAAA-MM-DD).' },
  )
  dataFim: string;

  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive({ message: 'postoId deve ser um número positivo.' })
  postoId: number;

  @IsInt({ message: 'regraId deve ser um número inteiro.' })
  @IsPositive({ message: 'regraId deve ser um número positivo.' })
  regraId: number;
}
