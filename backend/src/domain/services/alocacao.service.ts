import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAlocacaoDto } from 'src/infra/http/dtos/alocacao/create-alocacao.dto';
import { UpdateAlocacaoDto } from 'src/infra/http/dtos/alocacao/update-alocacao.dto';
import { AlocacaoRepository } from '../repositories/alocacao.repository';
import { Prisma } from '@prisma/client';
import { RegrasTrabalhistasService } from './regras-trabalhistas.service';
import { normalizeDate } from 'src/helpers/date.helpers';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Repare: ele não sabe o que é uma requisição HTTP (isso é
// do controller) nem como o banco funciona (isso é do repository).
// Ele só orquestra: "confere isso, se ok manda o repository salvar".
@Injectable()
export class AlocacaoService {
  constructor(
    private readonly repository: AlocacaoRepository,
    private readonly regras: RegrasTrabalhistasService,
  ) {}

  // Método privado (o `private` = só o próprio service usa, não vira rota
  // nem nada externo). Ele não faz o trabalho; ele só traduz erro do banco.
  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Este funcionário já está alocado neste dia e turno.',
        );
      }
      if (error.code === 'P2003') {
        throw new NotFoundException(
          'Funcionário, escala ou turno informado não existe.',
        );
      }
    }
    throw error;
  }

  async create(dto: CreateAlocacaoDto) {
    const data = normalizeDate(dto.data);

    // Antes de gravar, roda as mesmas regras (RN01-RN07 + conflito de
    // horário) que valeriam pra uma alocação criada pelo motor de
    // geração automática — ver RegrasTrabalhistasService. Lança 400,
    // 404 ou 409 conforme o tipo de violação.
    await this.regras.validarOuLancar({
      funcionarioId: dto.funcionarioId,
      data,
      turnoId: dto.turnoId,
      escalaId: dto.escalaId,
    });

    try {
      return await this.repository.create({ ...dto, data });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const alocacao = await this.repository.findById(id);
    if (!alocacao) {
      throw new NotFoundException(`Alocação com id ${id} não encontrada.`);
    }
    return alocacao;
  }

  async update(id: number, dto: UpdateAlocacaoDto) {
    const existente = await this.findOne(id);

    // Igual ao create, mas com os valores EFETIVOS: o que veio no PATCH,
    // senão o que já estava salvo (senão um update parcial perderia o
    // contexto necessário pra validar — ex: mudar só o turno sem
    // reenviar funcionarioId/data/escalaId).
    const data = dto.data ? normalizeDate(dto.data) : existente.data;
    await this.regras.validarOuLancar({
      funcionarioId: dto.funcionarioId ?? existente.funcionarioId,
      data,
      turnoId: dto.turnoId ?? existente.turnoId,
      escalaId: dto.escalaId ?? existente.escalaId,
      ignorarAlocacaoId: id,
    });

    try {
      return await this.repository.update(id, {
        ...dto,
        data: dto.data ? data : undefined,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
