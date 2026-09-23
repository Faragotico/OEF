import { Module } from '@nestjs/common';
import { AuthController } from 'src/infra/http/controllers/auth.controller';
import { AuthService } from 'src/domain/services/auth.service';
import { UsuarioRepository } from 'src/domain/repositories/usuario.repository';
import { PrismaService } from '../infra/database/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UsuarioRepository, PrismaService],
})
export class AuthModule {}
