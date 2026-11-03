import { Injectable } from '@nestjs/common';
import { Prisma, Empresa } from '@prisma/client';
import { PrismaService } from 'src/infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide nada — só executa consultas. Regras de negócio
// (ex: "CPF pode repetir?") não moram aqui, moram no service.
@Injectable()
export class EmpresaRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.EmpresaCreateInput): Promise<Empresa> {
    return this.prisma.empresa.create({ data });
  }

  findAll(): Promise<Empresa[]> {
    return this.prisma.empresa.findMany({ orderBy: { nome: 'asc' } });
  }

  // Quantas empresas por página. O corte acontece no banco: só as
  // linhas da página pedida saem da consulta e viajam pela rede.
  static readonly POR_PAGINA = 10;

  async findAllPaginado(
    where: Prisma.EmpresaWhereInput,
    page: number,
  ): Promise<{ data: Empresa[]; total: number }> {
    const take = EmpresaRepository.POR_PAGINA;
    const skip = (page - 1) * take;

    // A página de dados e a contagem do total saem juntas, em
    // paralelo. As duas recebem o MESMO `where`, senão o total
    // contaria empresas que o filtro já descartou.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.empresa.findMany({
        where,
        // `id` desempata nomes iguais, pra a ordem não mudar entre
        // uma página e outra.
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: number): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({ where: { id } });
  }

  findByCnpj(cnpj: string): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({ where: { cnpj } });
  }

  update(id: number, data: Prisma.EmpresaUpdateInput): Promise<Empresa> {
    return this.prisma.empresa.update({ where: { id }, data });
  }

  delete(id: number): Promise<Empresa> {
    return this.prisma.empresa.delete({ where: { id } });
  }
}
