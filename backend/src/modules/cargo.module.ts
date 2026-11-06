import { Module } from '@nestjs/common';
import { CargoController } from 'src/infra/http/controllers/cargo.controller';
import { CargoService } from 'src/domain/services/cargo.service';
import { CargoRepository } from 'src/domain/repositories/cargo.repository';
import { PrismaService } from '../infra/database/prisma.service';

// Exporta o repository: o FuncionarioService confere se o cargo
// escolhido existe antes de salvar.
@Module({
  controllers: [CargoController],
  providers: [CargoService, CargoRepository, PrismaService],
  exports: [CargoRepository],
})
export class CargoModule {}
