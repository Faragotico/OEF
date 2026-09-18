import { Injectable } from '@nestjs/common';
import { Prisma, Regra } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
// Repare: SEM `include` aqui. O PostoTrabalho incluía a empresa (o
// "pai" dele); a Regra não tem pai pra trazer junto — ela só tem
// escalas como filhas, que não precisamos carregar em todo GET.
@Injectable()
export class RegraRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RegraUncheckedCreateInput): Promise<Regra> {
    return this.prisma.regra.create({ data });
  }

  findAll(): Promise<Regra[]> {
    return this.prisma.regra.findMany({ orderBy: { tipo: 'asc' } });
  }

  findById(id: number): Promise<Regra | null> {
    return this.prisma.regra.findUnique({ where: { id } });
  }

  // Usado pelo RegraService pra garantir no máximo UMA regra por tipo
  // "global" (carga_horaria_semanal, intervalo_interjornada) — ver
  // comentário em RegraService.ensureTipoUnicoDisponivel.
  findByTipo(tipo: string): Promise<Regra | null> {
    return this.prisma.regra.findFirst({ where: { tipo } });
  }

  // Usado pela geração automática quando ninguém escolhe regraId
  // explicitamente. orderBy padrao 'desc' põe a marcada como padrão
  // (true > false) na frente; se nenhuma foi marcada ainda (banco
  // migrado de antes deste campo existir), cai na de menor id — mesmo
  // comportamento de sempre, só que agora determinístico e visível.
  findPadraoOuPrimeiro(tipo: string): Promise<Regra | null> {
    return this.prisma.regra.findFirst({
      where: { tipo },
      orderBy: [{ padrao: 'desc' }, { id: 'asc' }],
    });
  }

  // Marca UMA regra como padrão do seu tipo, desmarcando qualquer
  // outra do mesmo tipo — no máximo uma padrão por tipo, sempre.
  // Transação: as duas escritas ou acontecem juntas ou nenhuma
  // acontece, senão um erro no meio deixaria duas regras marcadas.
  async marcarComoPadrao(id: number, tipo: string): Promise<Regra> {
    const [, atualizada] = await this.prisma.$transaction([
      this.prisma.regra.updateMany({
        where: { tipo, padrao: true },
        data: { padrao: false },
      }),
      this.prisma.regra.update({ where: { id }, data: { padrao: true } }),
    ]);
    return atualizada;
  }

  // Usado no create: só marca a primeira regra de um tipo como padrão
  // automaticamente (não precisa clique extra no caso comum de só
  // existir uma).
  existePadrao(tipo: string): Promise<Regra | null> {
    return this.prisma.regra.findFirst({ where: { tipo, padrao: true } });
  }

  update(id: number, data: Prisma.RegraUncheckedUpdateInput): Promise<Regra> {
    return this.prisma.regra.update({ where: { id }, data });
  }

  delete(id: number): Promise<Regra> {
    return this.prisma.regra.delete({ where: { id } });
  }
}
