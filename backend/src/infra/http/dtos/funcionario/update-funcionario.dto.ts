import { PartialType } from '@nestjs/mapped-types';
import { CreateFuncionarioDto } from './create-funcionario.dto';

// PartialType pega TODOS os campos do CreateFuncionarioDto e os torna
// opcionais. Faz sentido: ao editar, o cliente pode mandar só o
// telefone novo, sem reenviar nome, cpf, etc. Não precisamos repetir
// nenhuma regra — herdamos todas do Create.
export class UpdateFuncionarioDto extends PartialType(CreateFuncionarioDto) {}
