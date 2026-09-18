import { Module } from '@nestjs/common';
import { AlocacaoController } from '../infra/http/controllers/alocacao.controller';
import { AlocacaoService } from '../domain/services/alocacao.service';
import { AlocacaoRepository } from '../domain/repositories/alocacao.repository';
import { RegrasTrabalhistasService } from '../domain/services/regras-trabalhistas.service';
import { PrismaService } from '../infra/database/prisma.service';
import { TurnoModule } from './turno.module';

// O Module é a "lista de peças" desta funcionalidade. O NestJS lê isso
// e sabe montar tudo: quando o controller pedir um AlocacaoService,
// que por sua vez pede um AlocacaoRepository e um
// RegrasTrabalhistasService, que pedem um PrismaService — o Nest cria
// e injeta cada um na ordem. Isso se chama injeção de dependência: você
// declara o que precisa, o Nest entrega.
@Module({
  // Importa o TurnoModule pra poder injetar o TurnoService no
  // AlocacaoService — é ele que resolve o "horário personalizado"
  // (acha ou cria um Turno com o horário digitado na hora).
  imports: [TurnoModule],
  controllers: [AlocacaoController],
  providers: [
    AlocacaoService,
    AlocacaoRepository,
    RegrasTrabalhistasService,
    PrismaService,
  ],
})
export class AlocacaoModule {}
