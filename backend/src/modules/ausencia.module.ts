import { Module } from '@nestjs/common';
import { AusenciaController } from '../infra/http/controllers/ausencia.controller';
import { AusenciaService } from '../domain/services/ausencia.service';
import { AusenciaRepository } from '../domain/repositories/ausencia.repository';
import { FuncionarioRepository } from '../domain/repositories/funcionario.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. FuncionarioRepository
// entra porque o AusenciaService confere se o funcionário informado
// existe de verdade antes de gravar (mesmo padrão do FuncionarioModule
// com TurnoRepository).
@Module({
  controllers: [AusenciaController],
  providers: [
    AusenciaService,
    AusenciaRepository,
    FuncionarioRepository,
    PrismaService,
  ],
})
export class AusenciaModule {}
