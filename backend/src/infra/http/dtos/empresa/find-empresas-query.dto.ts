import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// DTO da QUERY STRING de GET /empresas (ex: ?busca=mercantil&page=2).
// Igual ao FindAlocacoesQueryDto: valida os parâmetros da URL, todos
// opcionais — abrir a lista sem filtro nenhum também é válido, só que
// agora vem paginado, não a tabela inteira.
export class FindEmpresasQueryDto {
  // Texto livre: o service vai procurar no nome, no CNPJ OU no contato.
  @IsOptional()
  @IsString({ message: 'busca deve ser um texto.' })
  busca?: string;

  // Base 1 (página 1 = primeiros registros). Sem isso no request,
  // o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
