import { Injectable } from '@nestjs/common';
import { Prisma, Funcionario } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide nada — só executa consultas. Regras de negócio
// (ex: "CPF pode repetir?") não moram aqui, moram no service.
@Injectable()
export class FuncionarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FuncionarioCreateInput): Promise<Funcionario> {
    return this.prisma.funcionario.create({ data });
  }

  findAll(): Promise<Funcionario[]> {
    return this.prisma.funcionario.findMany({ orderBy: { nome: 'asc' } });
  }

  findById(id: number): Promise<Funcionario | null> {
    return this.prisma.funcionario.findUnique({ where: { id } });
  }

  findByCpf(cpf: string): Promise<Funcionario | null> {
    return this.prisma.funcionario.findUnique({ where: { cpf } });
  }

  update(
    id: number,
    data: Prisma.FuncionarioUpdateInput,
  ): Promise<Funcionario> {
    return this.prisma.funcionario.update({ where: { id }, data });
  }

  delete(id: number): Promise<Funcionario> {
    return this.prisma.funcionario.delete({ where: { id } });
  }
}
