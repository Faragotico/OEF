import { Module } from '@nestjs/common';
import { AlocacaoController } from './infra/http/controllers/alocacao.controller';
import { AlocacaoService } from './domain/services/alocacao.service';
import { AlocacaoRepository } from './domain/repositories/alocacao.repository';
import { PrismaService } from './infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O NestJS lê isso
// e sabe montar tudo: quando o controller pedir um AlocacaoService,
// que por sua vez pede um AlocacaoRepository, que pede um
// PrismaService — o Nest cria e injeta cada um na ordem. Isso se chama
// injeção de dependência: você declara o que precisa, o Nest entrega.
@Module({
  controllers: [AlocacaoController],
  providers: [AlocacaoService, AlocacaoRepository, PrismaService],
})
export class AlocacaoModule {}
