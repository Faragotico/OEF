import { Injectable } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
@Injectable()
export class UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  // O e-mail é guardado sempre em minúsculas (ver AuthService), então a
  // busca normaliza também — senão "Gestor@x.com" não acharia a linha
  // gravada como "gestor@x.com".
  findByEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(id: number): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }
}
