import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Matches } from 'class-validator';

// DTO da QUERY STRING de GET /escalas
// (ex: ?postoId=3&dataInicio=2026-11-01&dataFim=2026-11-30&page=2).
// Todos opcionais — abrir a lista sem filtro nenhum também é válido,
// só que vem paginado, não a tabela inteira.
export class FindEscalasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive()
  postoId?: number;

  // Período: traz as escalas que COBREM ao menos um dia dentro dele
  // (uma escala de 20/10 a 20/11 aparece ao filtrar novembro).
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataInicio deve estar no formato AAAA-MM-DD.',
  })
  dataInicio?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataFim deve estar no formato AAAA-MM-DD.',
  })
  dataFim?: string;

  // Base 1 (página 1 = primeiros registros). Sem isso, o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
