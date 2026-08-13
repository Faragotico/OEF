import { Module } from '@nestjs/common';
import { TurnoController } from 'src/infra/http/controllers/turno.controller';
import { TurnoService } from 'src/domain/services/turno.service';
import { TurnoRepository } from 'src/domain/repositories/turno.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O Nest lê isso e
// monta tudo por injeção de dependência: o controller pede o service,
// que pede o repository, que pede o PrismaService — o Nest cria e
// injeta cada um na ordem certa.
@Module({
  controllers: [TurnoController],
  providers: [TurnoService, TurnoRepository, PrismaService],
})
export class TurnoModule {}
