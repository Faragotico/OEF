import { PartialType } from '@nestjs/mapped-types';
import { CreateRegraDto } from './create-regra.dto';

// PartialType pega TODOS os campos do CreateRegraDto e os torna
// opcionais. No update o cliente pode mandar só o que mudou (por
// exemplo, só a descrição), sem reenviar tipo e valor. Não repetimos
// nenhuma regra — herdamos todas do Create.
export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
