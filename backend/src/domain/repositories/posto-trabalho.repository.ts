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

  // Quantos postos por página. O corte acontece no banco.
  static readonly POR_PAGINA = 10;

  async findAllPaginado(
    where: Prisma.PostoTrabalhoWhereInput,
    page: number,
  ): Promise<{ data: PostoTrabalho[]; total: number }> {
    const take = PostoTrabalhoRepository.POR_PAGINA;
    const skip = (page - 1) * take;

    // Página + total saem juntos, com o MESMO where.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.postoTrabalho.findMany({
        where,
        // `id` desempata nomes iguais (podem repetir entre empresas).
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        include: this.include,
        skip,
        take,
      }),
      this.prisma.postoTrabalho.count({ where }),
    ]);

    return { data, total };
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
