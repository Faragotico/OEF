import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

// DTO da QUERY STRING de GET /funcionarios
// (ex: ?busca=maria&postoId=3&status=todos&page=2).
// Todos opcionais — abrir a lista sem filtro nenhum também é válido,
// só que vem paginado e, por padrão, só com os funcionários ativos.
export class FindFuncionariosQueryDto {
  // Texto livre: o service procura no nome, CPF, telefone OU cargo.
  @IsOptional()
  @IsString({ message: 'busca deve ser um texto.' })
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive()
  postoId?: number;

  // Padrão (quando não vem): 'ativo'. 'todos' desliga o filtro.
  @IsOptional()
  @IsIn(['ativo', 'inativo', 'todos'], {
    message: "status deve ser 'ativo', 'inativo' ou 'todos'.",
  })
  status?: 'ativo' | 'inativo' | 'todos';

  // Base 1 (página 1 = primeiros registros). Sem isso, o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
