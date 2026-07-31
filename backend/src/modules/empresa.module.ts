import { Module } from '@nestjs/common';
import { EmpresaController } from 'src/infra/http/controllers/empresa.controller';
import { EmpresaService } from 'src/domain/services/empresa.service';
import { EmpresaRepository } from 'src/domain/repositories/empresa.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. O NestJS lê isso
// e sabe montar tudo: quando o controller pedir um EmpresaService,
// que por sua vez pede um EmpresaRepository, que pede um
// PrismaService — o Nest cria e injeta cada um na ordem. Isso se chama
// injeção de dependência: você declara o que precisa, o Nest entrega.
@Module({
  controllers: [EmpresaController],
  providers: [EmpresaService, EmpresaRepository, PrismaService],
})
export class EmpresaModule {}
