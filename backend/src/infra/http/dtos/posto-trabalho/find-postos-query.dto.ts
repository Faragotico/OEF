import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// DTO da QUERY STRING de GET /postos (ex: ?busca=centro&empresaId=3&page=2).
// Todos opcionais — abrir a lista sem filtro nenhum também é válido,
// só que agora vem paginado, não a tabela inteira.
export class FindPostosQueryDto {
  // Texto livre: o service procura no nome OU na localização do posto.
  @IsOptional()
  @IsString({ message: 'busca deve ser um texto.' })
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'empresaId deve ser um número inteiro.' })
  @IsPositive()
  empresaId?: number;

  // Base 1 (página 1 = primeiros registros). Sem isso no request,
  // o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
