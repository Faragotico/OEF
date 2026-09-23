import { Injectable } from '@nestjs/common';
import { Prisma, Escala } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
@Injectable()
export class EscalaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { posto: true, regra: true };

  create(data: Prisma.EscalaUncheckedCreateInput): Promise<Escala> {
    return this.prisma.escala.create({ data, include: this.include });
  }

  findAll(): Promise<Escala[]> {
    return this.prisma.escala.findMany({
      orderBy: { dataInic: 'desc' },
      include: this.include,
    });
  }

  // Escala do mesmo posto cujo período encosta no informado. Usada
  // pela geração automática pra não criar duas escalas concorrentes
  // pro mesmo posto e mês (ver GeracaoEscalaService).
  findSobreposta(
    postoId: number,
    dataInic: Date,
    dataFim: Date,
  ): Promise<Escala | null> {
    return this.prisma.escala.findFirst({
      where: {
        postoId,
        dataInic: { lte: dataFim },
        dataFim: { gte: dataInic },
      },
      orderBy: { dataInic: 'asc' },
    });
  }

  findById(id: number): Promise<Escala | null> {
    return this.prisma.escala.findUnique({
      where: { id },
      include: this.include,
    });
  }

  delete(id: number): Promise<Escala> {
    return this.prisma.escala.delete({ where: { id } });
  }
}
