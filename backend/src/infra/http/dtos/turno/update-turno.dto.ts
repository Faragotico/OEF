import { PartialType } from '@nestjs/mapped-types';
import { CreateTurnoDto } from './create-turno.dto';

// PartialType pega TODOS os campos do CreateTurnoDto e os torna
// opcionais. No update o cliente pode mandar só o que mudou (por
// exemplo, só a descrição), sem reenviar tipo e valor. Não repetimos
// nenhuma Turno — herdamos todas do Create.
export class UpdateTurnoDto extends PartialType(CreateTurnoDto) {}
