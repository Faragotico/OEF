import { IsString, MaxLength, MinLength } from 'class-validator';

// DTO de criação da Regra.
// Campos e limites vieram do Dicionário de Dados:
//   descricao VARCHAR(500) NOT NULL
//   tipo      VARCHAR(50)  NOT NULL   (ex: 'escala', 'intervalo_interjornada')
//   valor     VARCHAR(50)  NOT NULL   (ex: '5x1', '11', '44')
export class CreateRegraDto {
  @IsString()
  @MinLength(3, { message: 'A descrição deve ter ao menos 3 caracteres.' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres.' })
  descricao: string;

  @IsString()
  @MinLength(2, { message: 'O tipo deve ter ao menos 2 caracteres.' })
  @MaxLength(50, { message: 'O tipo deve ter no máximo 50 caracteres.' })
  tipo: string;

  @IsString()
  @MinLength(1, { message: 'O valor não pode ser vazio.' })
  @MaxLength(50, { message: 'O valor deve ter no máximo 50 caracteres.' })
  valor: string;
}
