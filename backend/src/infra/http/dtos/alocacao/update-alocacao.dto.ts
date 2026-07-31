import { PartialType } from '@nestjs/mapped-types';
import { CreateAlocacaoDto } from './create-alocacao.dto';

// PartialType pega TODOS os campos do CreateAlocacaoDto e os torna
// opcionais. Não precisamos repetir
// nenhuma regra — herdamos todas do Create.
export class UpdateAlocacaoDto extends PartialType(CreateAlocacaoDto) {}