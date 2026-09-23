import { Injectable } from '@nestjs/common';
import { Prisma, Funcionario } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide nada — só executa consultas. Regras de negócio
// (ex: "CPF pode repetir?") não moram aqui, moram no service.
//
// create/update usam os tipos "Unchecked" porque o Funcionario tem FKs
// (turnoPadraoId, postoId): o tipo "checked" exigiria a forma aninhada
// (turnoPadrao: { connect: {...} }) em vez do id cru.
//
// `habilitacoes` entra no include porque é dela que o presenter deriva
// se a pessoa é coringa (sem turno padrão, mas habilitada em outros) ou
// se o cadastro está incompleto (sem turno padrão e sem habilitação
// nenhuma). Sem o include, as duas situações ficariam indistinguíveis.
@Injectable()
export class FuncionarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    turnoPadrao: true,
    posto: true,
    habilitacoes: true,
  };

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
