import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// DTO = Data Transfer Object. É o "contrato" do que o cliente pode
// mandar ao criar uma empresa. Os decorators (@IsString etc.) são
// validados AUTOMATICAMENTE pelo NestJS antes de chegar no controller.
// Se algo estiver errado, o cliente recebe erro 400 sem a gente
// escrever uma linha de checagem.
export class CreateEmpresaDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome: string;

  @IsString()
  @Length(14, 14, { message: 'O CNPJ deve ter exatamente 14 dígitos.' })
  @Matches(/^\d{14}$/, {
    message: 'O CNPJ deve conter somente dígitos, sem pontos ou barras.',
  })
  cnpj: string;

  @IsOptional() // contato pode não vir (é String? no schema)
  @IsString()
  @MaxLength(100, { message: 'O contato deve ter no máximo 100 caracteres.' })
  contato?: string;
}
