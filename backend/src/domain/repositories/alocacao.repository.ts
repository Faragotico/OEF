import { Injectable } from '@nestjs/common';
import { Prisma, Alocacao } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar que conhece o Prisma. Ele não decide
// regras — só executa consultas. A diferença pro repository de
// Funcionario é que a Alocacao tem RELAÇÕES, e isso aparece de duas
// formas novas: o `include` (ao ler) e os campos *Id (ao gravar).
@Injectable()
export class AlocacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // NOVIDADE 1 — o `include`.
  // Sem ele, uma alocação voltaria "crua": { id: 1, funcionarioId: 3,
  // turnoId: 2, ... } — só os números. Com o include, o Prisma faz o
  // trabalho de ir nas outras tabelas e trazer os dados junto:
  // { id: 1, funcionario: { nome: "João"... }, turno: { descricao: "Manhã" }... }
  // Guardamos num campo só pra reaproveitar em todos os métodos.
  private readonly include = {
    funcionario: true,
    escala: true,
    turno: true,
  };

  // NOVIDADE 2 — os campos *Id ao gravar.
  // O tipo AlocacaoUncheckedCreateInput permite passar funcionarioId,
  // escalaId e turnoId como números diretos. ("Unchecked" aqui NÃO quer
  // dizer "inseguro" — quer dizer só que você passa os ids na mão, em
  // vez de usar a sintaxe `connect: { id }`. As duas fazem a mesma
  // ligação; essa é a mais simples.)
  create(data: Prisma.AlocacaoUncheckedCreateInput): Promise<Alocacao> {
    return this.prisma.alocacao.create({ data, include: this.include });
  }

  findAll(): Promise<Alocacao[]> {
    return this.prisma.alocacao.findMany({
      orderBy: { data: 'asc' },
      include: this.include,
    });
  }

  findById(id: number): Promise<Alocacao | null> {
    return this.prisma.alocacao.findUnique({
      where: { id },
      include: this.include,
    });
  }

  update(
    id: number,
    data: Prisma.AlocacaoUncheckedUpdateInput,
  ): Promise<Alocacao> {
    return this.prisma.alocacao.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  delete(id: number): Promise<Alocacao> {
    return this.prisma.alocacao.delete({ where: { id } });
  }
}
