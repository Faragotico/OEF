import { Injectable } from '@nestjs/common';
import { Cargo } from '@prisma/client';
import { PrismaService } from 'src/infra/database/prisma.service';

export type CargoComUso = Cargo & { _count: { funcionarios: number } };

// Único lugar que conhece o Prisma para cargos (ver EmpresaRepository).
@Injectable()
export class CargoRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(nome: string): Promise<Cargo> {
    return this.prisma.cargo.create({ data: { nome } });
  }

  // Vem com a contagem de funcionários: a tela mostra quantos usam cada
  // cargo, e isso explica por que "Excluir" é recusado em alguns.
  findAll(busca?: string): Promise<CargoComUso[]> {
    return this.prisma.cargo.findMany({
      where: busca
        ? { nome: { contains: busca, mode: 'insensitive' } }
        : undefined,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { funcionarios: true } } },
    });
  }

  findById(id: number): Promise<Cargo | null> {
    return this.prisma.cargo.findUnique({ where: { id } });
  }

  // Igualdade sem diferenciar maiúscula: "porteiro" e "Porteiro" são o
  // mesmo cargo para o gestor, então não podem coexistir.
  findByNome(nome: string): Promise<Cargo | null> {
    return this.prisma.cargo.findFirst({
      where: { nome: { equals: nome, mode: 'insensitive' } },
    });
  }

  update(id: number, nome: string): Promise<Cargo> {
    return this.prisma.cargo.update({ where: { id }, data: { nome } });
  }

  delete(id: number): Promise<Cargo> {
    return this.prisma.cargo.delete({ where: { id } });
  }
}
