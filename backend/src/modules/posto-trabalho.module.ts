import { Module } from '@nestjs/common';
import { PostoTrabalhoController } from 'src/infra/http/controllers/posto-trabalho.controller';
import { PostoTrabalhoService } from 'src/domain/services/posto-trabalho.service';
import { PostoTrabalhoRepository } from 'src/domain/repositories/posto-trabalho.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O NestJS lê isso
// e sabe montar tudo: quando o controller pedir um PostoTrabalhoService,
// que por sua vez pede um PostoTrabalhoRepository, que pede um
// PrismaService — o Nest cria e injeta cada um na ordem. Isso se chama
// injeção de dependência: você declara o que precisa, o Nest entrega.
@Module({
  controllers: [PostoTrabalhoController],
  providers: [PostoTrabalhoService, PostoTrabalhoRepository, PrismaService],
})
export class PostoTrabalhoModule {}
