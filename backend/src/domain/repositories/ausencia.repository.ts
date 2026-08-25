import { Injectable } from '@nestjs/common';
import { Ausencia, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
@Injectable()
export class AusenciaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { funcionario: true };

  create(data: Prisma.AusenciaUncheckedCreateInput): Promise<Ausencia> {
    return this.prisma.ausencia.create({ data, include: this.include });
  }

  findAll(): Promise<Ausencia[]> {
    return this.prisma.ausencia.findMany({
      orderBy: { dataInic: 'desc' },
      include: this.include,
    });
  }

  findById(id: number): Promise<Ausencia | null> {
    return this.prisma.ausencia.findUnique({
      where: { id },
      include: this.include,
    });
  }

  update(
    id: number,
    data: Prisma.AusenciaUncheckedUpdateInput,
  ): Promise<Ausencia> {
    return this.prisma.ausencia.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  delete(id: number): Promise<Ausencia> {
    return this.prisma.ausencia.delete({ where: { id } });
  }
}
