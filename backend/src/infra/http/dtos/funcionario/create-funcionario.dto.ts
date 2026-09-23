import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
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
  // formato, enquanto o @IsCpf reclama só do dígito.
  @IsCpf()
  cpf: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'O telefone deve estar no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.',
  })
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

  // Turno "de casa": o horário que a pessoa trabalha na maioria dos
  // dias. Por padrão o motor só a escala NELE, que é o que as escalas
  // reais mostram. Deixar vazio e informar turnosHabilitadosIds é como
  // se cadastra um coringa — não existe mais um campo booleano
  // separado dizendo a mesma coisa.
  @IsOptional()
  @IsInt({ message: 'turnoPadraoId deve ser um número inteiro.' })
  @IsPositive({ message: 'turnoPadraoId deve ser um número positivo.' })
  turnoPadraoId?: number;

  // Em que OUTROS turnos esta pessoa pode ser escalada. Para um
  // coringa, é a lista inteira dos turnos que ele cobre; para um
  // titular, é a folga de manobra que o gestor libera na geração.
  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'turnosHabilitadosIds não pode repetir o mesmo turno.' })
  @IsInt({ each: true, message: 'turnosHabilitadosIds deve conter apenas inteiros.' })
  turnosHabilitadosIds?: number[];

  // Dias da semana em que esta pessoa nunca é escalada (0 = domingo,
  // 6 = sábado). Caso real observado em quadros de posto de segurança:
  // um titular que nunca trabalha domingo.
  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'diasSemanaVetados não pode repetir o mesmo dia.' })
  @IsInt({ each: true, message: 'diasSemanaVetados deve conter apenas inteiros.' })
  @Min(0, { each: true, message: 'diasSemanaVetados vai de 0 (domingo) a 6 (sábado).' })
  @Max(6, { each: true, message: 'diasSemanaVetados vai de 0 (domingo) a 6 (sábado).' })
  diasSemanaVetados?: number[];

  // Posto onde a pessoa trabalha. É o que a geração automática usa pra
  // montar a escala com a equipe DAQUELE posto.
  @IsOptional()
  @IsInt({ message: 'postoId deve ser um número inteiro.' })
  @IsPositive({ message: 'postoId deve ser um número positivo.' })
  postoId?: number;
}
