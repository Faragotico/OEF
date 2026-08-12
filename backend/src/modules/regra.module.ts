import { Module } from '@nestjs/common';
import { RegraController } from 'src/infra/http/controllers/regra.controller';
import { RegraService } from 'src/domain/services/regra.service';
import { RegraRepository } from 'src/domain/repositories/regra.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O Nest lê isso e
// monta tudo por injeção de dependência: o controller pede o service,
// que pede o repository, que pede o PrismaService — o Nest cria e
// injeta cada um na ordem certa.
@Module({
  controllers: [RegraController],
  providers: [RegraService, RegraRepository, PrismaService],
})
export class RegraModule {}
