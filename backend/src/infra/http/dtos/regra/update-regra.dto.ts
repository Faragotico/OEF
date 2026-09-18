import { PartialType } from '@nestjs/mapped-types';
import { CreateRegraDto } from './create-regra.dto';

// PartialType pega TODOS os campos do CreateRegraDto e os torna
// opcionais. No update o cliente pode mandar só o que mudou (por
// exemplo, só a descrição), sem reenviar tipo e valor. Não repetimos
// nenhuma regra — herdamos todas do Create.
//
// Cuidado: o validador de "valor" (ValorRegraValidoConstraint) olha o
// "tipo" dentro do MESMO payload pra saber qual formato exigir. Um
// PATCH que manda só "valor" sem "tipo" seria validado como se fosse
// um tipo numérico (não "escala"). O RegraForm do frontend sempre
// reenvia tipo+valor juntos (nunca só um dos dois), então isso não
// acontece na prática — mas quem chamar a API direto precisa saber.
export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
