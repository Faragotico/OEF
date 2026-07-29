import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlocacaoRepository } from '../repositories/alocacao.repository';
import { CreateAlocacaoDto } from 'src/infra/http/dtos/create-alocacao.dto';
import { UpdateAlocacaoDto } from 'src/infra/http/dtos/update-alocacao.dto';
import { Prisma } from '@prisma/client';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Repare: ele não sabe o que é uma requisição HTTP (isso é
// do controller) nem como o banco funciona (isso é do repository).
// Ele só orquestra: "confere isso, se ok manda o repository salvar".

// métodos create, findAll, findOne, update, remove, cada um chamando o AlocacaoRepository

@Injectable()
export class AlocacaoService {
  constructor(private readonly repository: AlocacaoRepository) {}

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
    try {
      return await this.repository.create(dto);
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
    await this.findOne(id);
    try {
      return await this.repository.update(id, dto);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.repository.delete(id);
  }
}
