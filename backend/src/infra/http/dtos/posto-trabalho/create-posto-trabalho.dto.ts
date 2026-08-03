import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// DTO de criação do Posto de Trabalho.
// Campos e limites vieram do Dicionário de Dados:
//   nome  VARCHAR(100) NOT NULL
//   local VARCHAR(150) NOT NULL   -> no TypeScript chamamos de "localizacao"
//   id_empresa INT NOT NULL (FK)  -> no TypeScript chamamos de "empresaId"
export class CreatePostoTrabalhoDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome: string;

  @IsString()
  @MinLength(3, { message: 'A localização deve ter ao menos 3 caracteres.' })
  @MaxLength(150, {
    message: 'A localização deve ter no máximo 150 caracteres.',
  })
  localizacao: string;

  @IsInt({ message: 'O empresaId deve ser um número inteiro.' })
  @IsPositive({ message: 'O empresaId deve ser um número positivo.' })
  empresaId: number;
}
