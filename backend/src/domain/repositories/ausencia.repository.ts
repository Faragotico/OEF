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

  // Quantas ausências por página. O corte acontece no banco: só as
  // linhas da página pedida saem da consulta e viajam pela rede.
  static readonly POR_PAGINA = 10;

  async findAllPaginado(
    where: Prisma.AusenciaWhereInput,
    page: number,
  ): Promise<{ data: Ausencia[]; total: number }> {
    const take = AusenciaRepository.POR_PAGINA;
    const skip = (page - 1) * take;

    // Dados e total saem juntos e com o MESMO `where`, senão o total
    // contaria ausências que o filtro já descartou.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ausencia.findMany({
        where,
        // Mais recentes primeiro; `id` desempata datas iguais pra a
        // ordem não mudar entre uma página e outra.
        orderBy: [{ dataInic: 'desc' }, { id: 'desc' }],
        skip,
        take,
        include: this.include,
      }),
      this.prisma.ausencia.count({ where }),
    ]);

    return { data, total };
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
