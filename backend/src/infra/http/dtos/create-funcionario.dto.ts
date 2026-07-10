import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

// DTO = Data Transfer Object. É o "contrato" do que o cliente pode
// mandar ao criar um funcionário. Os decorators (@IsString etc.) são
// validados AUTOMATICAMENTE pelo NestJS antes de chegar no controller.
// Se algo estiver errado, o cliente recebe erro 400 sem a gente
// escrever uma linha de checagem.
export class CreateFuncionarioDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  nome: string;

  @IsString()
  @MinLength(11, { message: 'O CPF deve ter 11 dígitos.' })
  cpf: string;

  @IsOptional() // telefone pode não vir (é String? no schema)
  @IsString()
  telefone?: string;

  @IsString()
  cargo: string;

  @IsInt()
  @Min(1)
  @Max(44, { message: 'A carga semanal não pode passar de 44h (regra CLT).' })
  cargaHorariaSemanal: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
