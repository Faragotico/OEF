import { PartialType } from '@nestjs/mapped-types';
import { CreateEmpresaDto } from './create-empresa.dto';

// PartialType pega TODOS os campos do CreateEmpresaDto e os torna
// opcionais. Faz sentido: ao editar, o cliente pode mandar só o
// telefone novo, sem reenviar nome, cpf, etc. Não precisamos repetir
// nenhuma regra — herdamos todas do Create.
export class UpdateEmpresaDto extends PartialType(CreateEmpresaDto) {}
