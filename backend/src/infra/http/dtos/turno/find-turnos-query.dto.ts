import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// DTO da QUERY STRING de GET /turnos (ex: ?busca=manha&postoId=3&page=2).
// Todos opcionais — abrir a lista sem filtro nenhum também é válido,
// só que agora vem paginado, não a tabela inteira.
export class FindTurnosQueryDto {
  // Texto livre: o service procura na descrição do turno.
  @IsOptional()
  @IsString({ message: 'busca deve ser um texto.' })
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive()
  postoId?: number;

  // Base 1 (página 1 = primeiros registros). Sem isso no request,
  // o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
