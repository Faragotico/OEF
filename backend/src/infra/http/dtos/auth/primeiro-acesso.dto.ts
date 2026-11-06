import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// Cadastro do PRIMEIRO gestor, feito pela tela de primeiro acesso quando
// o banco ainda não tem nenhum usuário (ex.: logo depois de instalar o
// app desktop). Aqui, ao contrário do login, a força da senha é regra:
// é um cadastro, não uma conferência.
export class PrimeiroAcessoDto {
  @IsString()
  @MinLength(3, { message: 'O nome deve ter ao menos 3 caracteres.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(200)
  senha: string;
}
