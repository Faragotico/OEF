import { IsString, MaxLength, MinLength } from 'class-validator';

// Criar e editar mandam o mesmo campo único, então um DTO só serve aos dois.
export class CargoDto {
  @IsString()
  @MinLength(2, { message: 'O cargo deve ter ao menos 2 caracteres.' })
  @MaxLength(80, { message: 'O cargo deve ter no máximo 80 caracteres.' })
  nome: string;
}
