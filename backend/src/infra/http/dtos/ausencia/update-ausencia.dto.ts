import { PartialType } from '@nestjs/mapped-types';
import { CreateAusenciaDto } from './create-ausencia.dto';

// PartialType pega todos os campos do CreateAusenciaDto e os torna
// opcionais — mesmo padrão dos outros Update DTOs deste projeto.
export class UpdateAusenciaDto extends PartialType(CreateAusenciaDto) {}
