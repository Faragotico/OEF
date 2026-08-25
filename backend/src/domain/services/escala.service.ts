import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscalaRepository } from '../repositories/escala.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { RegraRepository } from '../repositories/regra.repository';
import { CreateEscalaDto } from 'src/infra/http/dtos/escala/create-escala.dto';
import { normalizeDate } from 'src/helpers/date.helpers';

// O service é o CÉREBRO: aplica as regras de negócio e decide o que
// fazer. Não sabe o que é requisição HTTP (controller) nem como o
// banco funciona (repository).
@Injectable()
export class EscalaService {
  constructor(
    private readonly repository: EscalaRepository,
    private readonly postoTrabalhoRepository: PostoTrabalhoRepository,
    private readonly regraRepository: RegraRepository,
  ) {}

  async create(dto: CreateEscalaDto) {
    const dataInic = normalizeDate(dto.dataInicio);
    const dataFim = normalizeDate(dto.dataFim);

    if (dataFim < dataInic) {
      throw new BadRequestException(
        'dataFim deve ser igual ou posterior a dataInicio.',
      );
    }

    const posto = await this.postoTrabalhoRepository.findById(dto.postoId);
    if (!posto) {
      throw new NotFoundException(
        `Posto de trabalho com id ${dto.postoId} não encontrado.`,
      );
    }

    const regra = await this.regraRepository.findById(dto.regraId);
    if (!regra) {
      throw new NotFoundException(`Regra com id ${dto.regraId} não encontrada.`);
    }

    return this.repository.create({
      dataInic,
      dataFim,
      postoId: dto.postoId,
      regraId: dto.regraId,
    });
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const escala = await this.repository.findById(id);
    if (!escala) {
      throw new NotFoundException(`Escala com id ${id} não encontrada.`);
    }
    return escala;
  }

  async remove(id: number) {
    await this.findOne(id);
    // Alocações vinculadas são apagadas em cascata (onDelete: Cascade no
    // schema) — diferente de PostoTrabalho/Regra, que BLOQUEIAM a
    // exclusão (onDelete: Restrict) quando têm escalas vinculadas.
    return this.repository.delete(id);
  }
}
