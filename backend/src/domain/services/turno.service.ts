import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TurnoRepository } from '../repositories/turno.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { CreateTurnoDto } from 'src/infra/http/dtos/turno/create-turno.dto';
import { UpdateTurnoDto } from 'src/infra/http/dtos/turno/update-turno.dto';
import { parseTime, formatTime } from 'src/helpers/date.helpers';

// Demanda padrão de um turno novo: uma pessoa em cada dia da semana.
// É o comportamento que o sistema sempre teve; reduzir o domingo é uma
// escolha do gestor, não um padrão que o sistema impõe.
const DEMANDA_PADRAO = [1, 1, 1, 1, 1, 1, 1];

// O service é o CÉREBRO: aplica as regras de negócio e decide o que
// fazer. Não sabe o que é requisição HTTP (controller) nem como o
// banco funciona (repository).
@Injectable()
export class TurnoService {
  constructor(
    private readonly repository: TurnoRepository,
    private readonly postoTrabalhoRepository: PostoTrabalhoRepository,
  ) {}

  async create(dto: CreateTurnoDto) {
    await this.validarPosto(dto.postoId);

    const criado = await this.repository.create({
      descricao: dto.descricao,
      horaInicio: parseTime(dto.horaInicio),
      horaFim: parseTime(dto.horaFim),
      postoId: dto.postoId,
      // Só turno de posto tem demanda: um turno avulso (horário
      // personalizado de uma alocação) não faz parte de grade nenhuma.
      demandas: dto.postoId
        ? {
            create: (dto.demandaPorDiaDaSemana ?? DEMANDA_PADRAO).map(
              (quantidade, diaSemana) => ({ diaSemana, quantidade }),
            ),
          }
        : undefined,
    });

    return this.repository.findById(criado.id);
  }

  findAll() {
    return this.repository.findAll();
  }

  findByPosto(postoId: number) {
    return this.repository.findByPosto(postoId);
  }

  /**
   * Acha um turno AVULSO já cadastrado com esse horário exato, ou cria
   * um novo na hora. Usado pelo AlocacaoService quando o gestor edita
   * uma célula com um horário que não bate com nenhum turno da grade.
   *
   * Só reaproveita turno avulso de propósito: um turno que pertence à
   * grade de um posto tem demanda própria, e grudar uma alocação
   * solta nele misturaria a grade de um posto com a de outro.
   */
  async encontrarOuCriarPorHorario(
    horaInicioStr: string,
    horaFimStr: string,
  ): Promise<number> {
    const horaInicio = parseTime(horaInicioStr);
    const horaFim = parseTime(horaFimStr);

    const existente = await this.repository.findAvulsoByHorario(horaInicio, horaFim);
    if (existente) return existente.id;

    const criado = await this.repository.create({
      descricao: `Personalizado ${horaInicioStr}-${horaFimStr}`,
      horaInicio,
      horaFim,
    });
    return criado.id;
  }

  async findOne(id: number) {
    const turno = await this.repository.findById(id);
    if (!turno) {
      throw new NotFoundException(`Turno com id ${id} não encontrado.`);
    }
    return turno;
  }

  async update(id: number, dto: UpdateTurnoDto) {
    const existente = await this.findOne(id);
    await this.validarPosto(dto.postoId);

    // O @Validate do CreateTurnoDto não consegue garantir horaFim >
    // horaInicio num PATCH parcial, porque só enxerga o que veio na
    // requisição. AQUI, com acesso ao registro existente, é o lugar
    // certo de comparar os valores efetivos.
    const horaInicioEfetiva = dto.horaInicio ?? formatTime(existente.horaInicio);
    const horaFimEfetiva = dto.horaFim ?? formatTime(existente.horaFim);
    if (horaFimEfetiva <= horaInicioEfetiva) {
      throw new BadRequestException('horaFim deve ser posterior a horaInicio.');
    }

    await this.repository.update(id, {
      descricao: dto.descricao,
      horaInicio: dto.horaInicio ? parseTime(dto.horaInicio) : undefined,
      horaFim: dto.horaFim ? parseTime(dto.horaFim) : undefined,
      postoId: dto.postoId,
    });

    // A demanda é uma lista: quando vem no corpo, substitui a que
    // estava lá inteira — um PATCH que só acrescentasse não teria como
    // zerar o domingo.
    if (dto.demandaPorDiaDaSemana) {
      await this.repository.definirDemanda(id, dto.demandaPorDiaDaSemana);
    }

    return this.repository.findById(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // P2003 aqui é o onDelete: Restrict do schema impedindo apagar um
      // turno que ainda tem alocações. Devolvemos 409 (conflito de
      // estado) em vez do erro cru do Prisma.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: existem alocações vinculadas a este turno.',
        );
      }
      throw error;
    }
  }

  private async validarPosto(postoId?: number) {
    if (!postoId) return;
    const posto = await this.postoTrabalhoRepository.findById(postoId);
    if (!posto) {
      throw new NotFoundException(
        `Posto de trabalho com id ${postoId} não encontrado.`,
      );
    }
  }
}
