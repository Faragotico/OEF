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
