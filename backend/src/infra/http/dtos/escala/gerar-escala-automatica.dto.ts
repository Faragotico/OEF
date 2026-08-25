import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

// DTO da UC05 — Gerar Escala Automaticamente.
// O gestor informa o período e o posto; regraId e funcionarioIds são
// opcionais (o sistema assume a primeira regra do tipo 'escala'
// cadastrada, e considera todos os funcionários ativos com turno
// padrão definido, se não vierem).
//
// turnoIds saiu do DTO: não faz mais sentido escolher "quais turnos
// cobrir" — cada funcionário já tem o turno dele fixo (turnoPadraoId).
// O motor só decide quais dias cada um trabalha ou folga.
export class GerarEscalaAutomaticaDto {
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

  @IsOptional()
  @IsInt({ message: 'regraId deve ser um número inteiro.' })
  @IsPositive({ message: 'regraId deve ser um número positivo.' })
  regraId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({
    message: 'funcionarioIds, se informado, não pode ser vazio.',
  })
  @IsInt({
    each: true,
    message: 'funcionarioIds deve conter apenas números inteiros.',
  })
  funcionarioIds?: number[];
}
