import { PartialType } from '@nestjs/mapped-types';
import { CreatePostoTrabalhoDto } from './create-posto-trabalho.dto';

// PartialType pega TODOS os campos do CreatePostoTrabalhoDto e os torna
// opcionais. Faz sentido: ao editar, o cliente pode mandar só o
// telefone novo, sem reenviar nome, cpf, etc. Não precisamos repetir
// nenhuma regra — herdamos todas do Create.

export class UpdatePostoTrabalhoDto extends PartialType(
  CreatePostoTrabalhoDto,
) {}
