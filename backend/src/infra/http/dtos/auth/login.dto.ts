import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// O contrato do login. Repare que a validação aqui é de FORMATO, não de
// força de senha: exigir "mínimo 8 caracteres" no login recusaria com
// erro de validação uma senha antiga mais curta, e ainda entregaria de
// graça a informação de que a senha digitada não pode ser a certa.
// Regra de força pertence ao cadastro, não à conferência.
export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(200)
  senha: string;
}
