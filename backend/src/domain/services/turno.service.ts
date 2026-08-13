import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TurnoRepository } from '../repositories/turno.repository';
import { CreateTurnoDto } from 'src/infra/http/dtos/turno/create-turno.dto';
import { UpdateTurnoDto } from 'src/infra/http/dtos/turno/update-turno.dto';
import { parseTime } from 'src/helpers/date.helpers';

// O service é o CÉREBRO: aplica as regras de negócio e decide o que
// fazer. Não sabe o que é requisição HTTP (controller) nem como o
// banco funciona (repository).
@Injectable()
export class TurnoService {
  constructor(private readonly repository: TurnoRepository) {}

  async create(dto: CreateTurnoDto) {
    return this.repository.create({
      descricao: dto.descricao,
      horaInicio: parseTime(dto.horaInicio),
      horaFim: parseTime(dto.horaFim),
    });
  }

  findAll() {
    return this.repository.findAll();
  }

  /**
   * Busca uma turno pelo id.
   * @throws NotFoundException se não existir.
   */
  async findOne(id: number) {
    const turno = await this.repository.findById(id);
    if (!turno) {
      throw new NotFoundException(`Turno com id ${id} não encontrada.`);
    }
    return turno;
  }

  async update(id: number, dto: UpdateTurnoDto) {
    await this.findOne(id);
    // update é parcial: só converte a hora se ela veio no corpo.
    return this.repository.update(id, {
      descricao: dto.descricao,
      horaInicio: dto.horaInicio ? parseTime(dto.horaInicio) : undefined,
      horaFim: dto.horaFim ? parseTime(dto.horaFim) : undefined,
    });
  }

  /**
   * Exclui uma turno.
   * @throws ConflictException se houver escalas vinculadas à turno.
   */
  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // Aqui o P2003 significa: o onDelete: Restrict do schema está
      // impedindo apagar uma turno que ainda tem escalas vinculadas.
      // Devolvemos 409 (conflito de estado). Mesmo padrão do PostoTrabalho.
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
}
