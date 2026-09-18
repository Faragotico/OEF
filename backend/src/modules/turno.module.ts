import { Module } from '@nestjs/common';
import { TurnoController } from 'src/infra/http/controllers/turno.controller';
import { TurnoService } from 'src/domain/services/turno.service';
import { TurnoRepository } from 'src/domain/repositories/turno.repository';
import { PostoTrabalhoRepository } from 'src/domain/repositories/posto-trabalho.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O Nest lê isso e
// monta tudo por injeção de dependência: o controller pede o service,
// que pede o repository, que pede o PrismaService — o Nest cria e
// injeta cada um na ordem certa.
//
// PostoTrabalhoRepository entrou aqui porque o turno agora pertence a
// um posto: o service confere que o posto informado existe antes de
// gravar o FK, mesmo padrão do FuncionarioService.
@Module({
  controllers: [TurnoController],
  providers: [TurnoService, TurnoRepository, PostoTrabalhoRepository, PrismaService],
  // Exporta o TurnoService pra outro módulo (AlocacaoModule) poder
  // injetar ele — é assim que a Alocacao consegue achar/criar um
  // Turno na hora de resolver um horário personalizado.
  exports: [TurnoService],
})
export class TurnoModule {}
