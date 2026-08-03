import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsCpf } from '../../validators/is-cpf.validator';

// DTO = Data Transfer Object. É o "contrato" do que o cliente pode
// mandar ao criar um funcionário. Os decorators (@IsString etc.) são
// validados AUTOMATICAMENTE pelo NestJS antes de chegar no controller.
// Se algo estiver errado, o cliente recebe erro 400 sem a gente
// escrever uma linha de checagem.
export class CreateFuncionarioDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome: string;

  @IsString()
  @Length(11, 11, { message: 'O CPF deve ter exatamente 11 dígitos.' })
  @Matches(/^\d{11}$/, {
    message: 'O CPF deve conter somente dígitos, sem pontos ou traço.',
  })
  // @IsCpf confere o dígito verificador (RNDoc01). Mantemos @Length e
  // @Matches junto de propósito: eles dão mensagens específicas de
  // formato, enquanto o @IsCpf reclama só do dígito. Assim o usuário
  // sabe se errou o tamanho ou se digitou um número errado.
  @IsCpf()
  cpf: string;

  @IsOptional() // telefone pode não vir (é String? no schema)
  @IsString()
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  telefone?: string;

  @IsString()
  @MinLength(2, { message: 'O cargo deve ter ao menos 2 caracteres.' })
  @MaxLength(80, { message: 'O cargo deve ter no máximo 80 caracteres.' })
  cargo: string;

  @IsInt()
  @Min(1, { message: 'A carga semanal deve ser maior que zero.' })
  @Max(168, { message: 'A carga semanal não pode passar de 168h na semana.' })
  cargaHorariaSemanal: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
