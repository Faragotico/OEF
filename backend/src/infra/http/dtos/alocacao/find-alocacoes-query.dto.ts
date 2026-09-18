import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, Matches } from 'class-validator';

// DTO da QUERY STRING de GET /alocacoes (ex: ?funcionarioId=3&page=2).
// Diferente do CreateAlocacaoDto (que valida o BODY do POST), este
// valida os parâmetros da URL — todos opcionais, porque buscar sem
// filtro nenhum também é válido (só que agora vem paginado, não a
// tabela inteira de uma vez — ver AlocacaoRepository.findAllPaginado).
export class FindAlocacoesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'funcionarioId deve ser um número inteiro.' })
  @IsPositive()
  funcionarioId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'turnoId deve ser um número inteiro.' })
  @IsPositive()
  turnoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'escalaId deve ser um número inteiro.' })
  @IsPositive()
  escalaId?: number;

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

  @IsOptional()
  @IsIn(['sim', 'nao'], { message: 'substituido deve ser "sim" ou "nao".' })
  substituido?: 'sim' | 'nao';

  // Base 1 (página 1 = primeiros registros). Sem isso no request,
  // o service assume 1.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um número inteiro.' })
  @IsPositive()
  page?: number;
}
