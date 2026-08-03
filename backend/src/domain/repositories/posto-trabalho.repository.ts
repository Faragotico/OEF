import { Injectable } from '@nestjs/common';
import { Prisma, PostoTrabalho } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas. Decidir se a empresa
// existe, se pode apagar, etc., é trabalho do service.
@Injectable()
export class PostoTrabalhoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { empresa: true };

  create(
    data: Prisma.PostoTrabalhoUncheckedCreateInput,
  ): Promise<PostoTrabalho> {
    return this.prisma.postoTrabalho.create({ data, include: this.include });
  }

  findAll(): Promise<PostoTrabalho[]> {
    return this.prisma.postoTrabalho.findMany({
      orderBy: { nome: 'asc' },
      include: this.include,
    });
  }

  findById(id: number): Promise<PostoTrabalho | null> {
    return this.prisma.postoTrabalho.findUnique({
      where: { id },
      include: this.include,
    });
  }

  update(
    id: number,
    data: Prisma.PostoTrabalhoUncheckedUpdateInput,
  ): Promise<PostoTrabalho> {
    return this.prisma.postoTrabalho.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  delete(id: number): Promise<PostoTrabalho> {
    return this.prisma.postoTrabalho.delete({ where: { id } });
  }
}
