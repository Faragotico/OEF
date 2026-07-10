import { Module } from '@nestjs/common';
import { FuncionarioController } from './infra/http/controllers/funcionario.controller';
import { FuncionarioService } from './domain/services/funcionario.service';
import { FuncionarioRepository } from './domain/repositories/funcionario.repository';
import { PrismaService } from './infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O NestJS lê isso
// e sabe montar tudo: quando o controller pedir um FuncionarioService,
// que por sua vez pede um FuncionarioRepository, que pede um
// PrismaService — o Nest cria e injeta cada um na ordem. Isso se chama
// injeção de dependência: você declara o que precisa, o Nest entrega.
@Module({
  controllers: [FuncionarioController],
  providers: [FuncionarioService, FuncionarioRepository, PrismaService],
})
export class FuncionarioModule {}
