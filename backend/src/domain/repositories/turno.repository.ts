import { Injectable } from '@nestjs/common';
import { Prisma, Turno } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide Regras — só executa consultas.
// Repare: SEM `include` aqui. O PostoTrabalho incluía a empresa (o
// "pai" dele); a Turno não tem pai pra trazer junto — ela só tem
// escalas como filhas, que não precisamos carregar em todo GET.
@Injectable()
export class TurnoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TurnoUncheckedCreateInput): Promise<Turno> {
    return this.prisma.turno.create({ data });
  }

  findAll(): Promise<Turno[]> {
    return this.prisma.turno.findMany({ orderBy: { descricao: 'asc' } });
  }

  findById(id: number): Promise<Turno | null> {
    return this.prisma.turno.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.TurnoUncheckedUpdateInput): Promise<Turno> {
    return this.prisma.turno.update({ where: { id }, data });
  }

  delete(id: number): Promise<Turno> {
    return this.prisma.turno.delete({ where: { id } });
  }
}
