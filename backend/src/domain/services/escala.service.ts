import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EscalaRepository } from '../repositories/escala.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { RegraRepository } from '../repositories/regra.repository';
import { CreateEscalaDto } from 'src/infra/http/dtos/escala/create-escala.dto';
import { FindEscalasQueryDto } from 'src/infra/http/dtos/escala/find-escalas-query.dto';
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

  // Lista completa (sem paginar): só pra preencher dropdowns (ex: o
  // filtro de escala na tela de alocações).
  findAll() {
    return this.repository.findAll();
  }

  // Monta o filtro (where do Prisma) a partir da query string e busca
  // só a página pedida — ver EscalaRepository.findAllPaginado.
  async findAllPaginado(query: FindEscalasQueryDto) {
    const page = query.page ?? 1;

    const where: Prisma.EscalaWhereInput = {};

    if (query.postoId !== undefined) {
      where.postoId = query.postoId;
    }

    // Período por SOBREPOSIÇÃO: a escala entra se terminar depois do
    // início do filtro E começar antes do fim dele. Cada ponta é
    // opcional — só uma delas também funciona.
    if (query.dataInicio) {
      where.dataFim = { gte: normalizeDate(query.dataInicio) };
    }
    if (query.dataFim) {
      where.dataInic = { lte: normalizeDate(query.dataFim) };
    }

    const { data, total } = await this.repository.findAllPaginado(where, page);

    return {
      data,
      total,
      page,
      // Math.max(1, ...) pra lista vazia mostrar "página 1 de 1".
      totalPaginas: Math.max(
        1,
        Math.ceil(total / EscalaRepository.POR_PAGINA),
      ),
    };
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
