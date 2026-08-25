import { Injectable } from '@nestjs/common';
import { Prisma, Funcionario } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide nada — só executa consultas. Regras de negócio
// (ex: "CPF pode repetir?") não moram aqui, moram no service.
//
// create/update agora usam os tipos "Unchecked": desde que o
// Funcionario ganhou o FK turnoPadraoId, o tipo "checked" do Prisma
// passaria a exigir a forma aninhada (turnoPadrao: { connect: {...} } })
// em vez do id cru — o Unchecked aceita turnoPadraoId direto, igual ao
// resto dos repositories deste projeto (Alocacao, Turno, Regra etc.).
@Injectable()
export class FuncionarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = { turnoPadrao: true };

  create(data: Prisma.FuncionarioUncheckedCreateInput): Promise<Funcionario> {
    return this.prisma.funcionario.create({ data, include: this.include });
  }

  findAll(): Promise<Funcionario[]> {
    return this.prisma.funcionario.findMany({
      orderBy: { nome: 'asc' },
      include: this.include,
    });
  }

  findById(id: number): Promise<Funcionario | null> {
    return this.prisma.funcionario.findUnique({
      where: { id },
      include: this.include,
    });
  }

  findByCpf(cpf: string): Promise<Funcionario | null> {
    return this.prisma.funcionario.findUnique({ where: { cpf } });
  }

  update(
    id: number,
    data: Prisma.FuncionarioUncheckedUpdateInput,
  ): Promise<Funcionario> {
    return this.prisma.funcionario.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  delete(id: number): Promise<Funcionario> {
    return this.prisma.funcionario.delete({ where: { id } });
  }
}
