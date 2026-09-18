import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

// Mesma checagem do CreateTurnoDto (ver o comentário lá): horaFim
// precisa ser depois de horaInicio quando os dois vierem juntos. Se um
// dos dois não vier, deixa passar — quem faz a checagem "os dois têm
// que vir juntos" é o AlocacaoService.resolverTurnoId, não o DTO.
@ValidatorConstraint({ name: 'horaFimDepoisAlocacao', async: false })
class HoraFimDepoisAlocacaoConstraint implements ValidatorConstraintInterface {
  validate(horaFim: string, args: ValidationArguments) {
    const horaInicio = (args.object as any)[args.constraints[0]];
    if (horaInicio === undefined || horaFim === undefined) return true;
    return typeof horaFim === 'string' && horaFim > horaInicio;
  }
  defaultMessage() {
    return 'horaFim deve ser posterior a horaInicio.';
  }
}

// DTO de criação da Alocacao.
// Lembre: o DTO é o "contrato" do que o CLIENTE manda pela internet.
// Ele valida os dados ANTES de chegarem no banco. Nada de id aqui —
// o id é gerado pelo banco (@default(autoincrement()) no schema).
//
// A novidade em relação ao Funcionario são os campos *Id. Eles são os
// "ponteiros" pras outras tabelas (funcionário, escala, turno). Aqui no
// DTO eles são só números inteiros — a checagem de "esse id existe de
// verdade?" NÃO é papel do DTO, é do service (regra de negócio).
export class CreateAlocacaoDto {
  // Vem como texto ISO no JSON, ex: "2026-07-25".
  // @Type converte esse texto em Date (graças ao transform: true do
  // ValidationPipe), e @IsDate confere se a conversão deu uma data válida.
  @Type(() => Date)
  @IsDate({ message: 'data deve ser uma data válida.' })
  data: Date;

  @IsInt({ message: 'funcionarioId deve ser um número inteiro.' })
  funcionarioId: number;

  @IsInt({ message: 'escalaId deve ser um número inteiro.' })
  escalaId: number;

  // Agora OPCIONAL: ou o cliente manda turnoId (um turno já
  // cadastrado), ou manda horaInicio+horaFim (horário personalizado
  // avulso pra essa alocação — o AlocacaoService acha ou cria um
  // Turno com esse horário na hora). A regra "um dos dois, nunca os
  // dois nem nenhum" é checada em AlocacaoService.resolverTurnoId —
  // não dá pra expressar "obrigatório A OU B" só com class-validator.
  @IsOptional()
  @IsInt({ message: 'turnoId deve ser um número inteiro.' })
  turnoId?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaInicio deve estar no formato HH:MM.',
  })
  horaInicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaFim deve estar no formato HH:MM.',
  })
  @Validate(HoraFimDepoisAlocacaoConstraint, ['horaInicio'])
  horaFim?: string;

  // Opcional: se o cliente não mandar, o banco preenche false (@default).
  // Se mandar, precisa ser booleano. Mesma ideia do status? no Funcionario.
  @IsOptional()
  @IsBoolean()
  ehSubstituido?: boolean;
}
