import { Injectable } from '@nestjs/common';
import { Prisma, Turno } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';

// O repository é o único lugar do sistema que conhece o Prisma.
// Ele NÃO decide regras — só executa consultas.
//
// O include traz posto e demandas porque, desde que o turno passou a
// pertencer a um posto, essas duas coisas fazem parte da identidade
// dele: um turno sem saber de que posto é e de quanta gente precisa em
// cada dia não é um turno completo pra quem vai gerar escala.
@Injectable()
export class TurnoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    posto: true,
    demandas: { orderBy: { diaSemana: 'asc' } },
  } satisfies Prisma.TurnoInclude;

  create(data: Prisma.TurnoUncheckedCreateInput): Promise<Turno> {
    return this.prisma.turno.create({ data, include: this.include });
  }

  findAll(): Promise<Turno[]> {
    return this.prisma.turno.findMany({
      orderBy: [{ postoId: 'asc' }, { horaInicio: 'asc' }],
      include: this.include,
    });
  }

  /** A grade de horários de um posto — a entrada do motor de escala. */
  findByPosto(postoId: number): Promise<Turno[]> {
    return this.prisma.turno.findMany({
      where: { postoId },
      orderBy: { horaInicio: 'asc' },
      include: this.include,
    });
  }

  findById(id: number): Promise<Turno | null> {
    return this.prisma.turno.findUnique({ where: { id }, include: this.include });
  }

  // Usado pelo "horário personalizado" da Alocacao: antes de criar um
  // Turno novo do zero, confere se já não existe um cadastrado com esse
  // horário EXATO (evita duplicar "08:00-16:00" toda vez que alguém
  // digita o mesmo horário avulso). Só considera turno avulso — um
  // turno que pertence a um posto é parte da grade dele e não deve ser
  // reaproveitado como horário solto de outro lugar.
  findAvulsoByHorario(horaInicio: Date, horaFim: Date): Promise<Turno | null> {
    return this.prisma.turno.findFirst({
      where: { horaInicio, horaFim, postoId: null },
    });
  }

  update(id: number, data: Prisma.TurnoUncheckedUpdateInput): Promise<Turno> {
    return this.prisma.turno.update({ where: { id }, data, include: this.include });
  }

  /** Substitui a demanda semanal inteira de um turno, numa transação. */
  async definirDemanda(turnoId: number, porDiaDaSemana: number[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.turnoDemanda.deleteMany({ where: { turnoId } }),
      this.prisma.turnoDemanda.createMany({
        data: porDiaDaSemana.map((quantidade, diaSemana) => ({
          turnoId,
          diaSemana,
          quantidade,
        })),
      }),
    ]);
  }

  delete(id: number): Promise<Turno> {
    return this.prisma.turno.delete({ where: { id } });
  }
}
