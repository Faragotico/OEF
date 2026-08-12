import { Injectable } from '@nestjs/common';
import { Prisma, Regra } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
// Repare: SEM `include` aqui. O PostoTrabalho incluía a empresa (o
// "pai" dele); a Regra não tem pai pra trazer junto — ela só tem
// escalas como filhas, que não precisamos carregar em todo GET.
@Injectable()
export class RegraRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RegraUncheckedCreateInput): Promise<Regra> {
    return this.prisma.regra.create({ data });
  }

  findAll(): Promise<Regra[]> {
    return this.prisma.regra.findMany({ orderBy: { tipo: 'asc' } });
  }

  findById(id: number): Promise<Regra | null> {
    return this.prisma.regra.findUnique({ where: { id } });
  }

  update(id: number, data: Prisma.RegraUncheckedUpdateInput): Promise<Regra> {
    return this.prisma.regra.update({ where: { id }, data });
  }

  delete(id: number): Promise<Regra> {
    return this.prisma.regra.delete({ where: { id } });
  }
}
