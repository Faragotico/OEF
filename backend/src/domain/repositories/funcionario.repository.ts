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
    posto: { include: { empresa: true } },
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

  // Quantos funcionários por página. O corte acontece no banco: só as
  // linhas da página pedida saem da consulta e viajam pela rede.
  static readonly POR_PAGINA = 10;

  async findAllPaginado(
    where: Prisma.FuncionarioWhereInput,
    page: number,
  ): Promise<{ data: Funcionario[]; total: number }> {
    const take = FuncionarioRepository.POR_PAGINA;
    const skip = (page - 1) * take;

    // Dados e total saem juntos e com o MESMO `where`, senão o total
    // contaria funcionários que o filtro já descartou.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.funcionario.findMany({
        where,
        // `id` desempata nomes iguais, pra a ordem não mudar entre
        // uma página e outra.
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip,
        take,
        include: this.include,
      }),
      this.prisma.funcionario.count({ where }),
    ]);

    return { data, total };
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
