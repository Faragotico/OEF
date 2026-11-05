import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { TIPOS_REGRA } from './create-regra.dto';

// DTO da QUERY STRING de GET /regras (ex: ?tipo=escala&busca=5x1&page=2).
// Todos opcionais — abrir a lista sem filtro nenhum também é válido,
// só que vem paginado, não a tabela inteira.
export class FindRegrasQueryDto {
  // Texto livre: o service procura na descrição OU no valor ("5x1").
  @IsOptional()
  @IsString({ message: 'busca deve ser um texto.' })
  busca?: string;

  @IsOptional()
  @IsIn(TIPOS_REGRA, {
    message: `tipo deve ser um destes: ${TIPOS_REGRA.join(', ')}.`,
  })
  tipo?: (typeof TIPOS_REGRA)[number];

  // Base 1 (página 1 = primeiros registros). Sem isso, o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
