import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { CreatePostoTrabalhoDto } from 'src/infra/http/dtos/posto-trabalho/create-posto-trabalho.dto';
import { UpdatePostoTrabalhoDto } from 'src/infra/http/dtos/posto-trabalho/update-posto-trabalho.dto';

// O service é o CÉREBRO: aplica as regras de negócio e decide o que fazer.
// Não sabe o que é requisição HTTP (isso é do controller) nem como o banco
// funciona (isso é do repository).
// Diferente de Funcionario e Empresa, PostoTrabalho NÃO tem campo único:
// dois postos podem se chamar "Portaria Principal" em empresas distintas,
// e isso é legítimo. Por isso aqui não existe checagem de duplicidade.
// A regra própria do posto é outra: a empresa que ele referencia deve existir.
@Injectable()
export class PostoTrabalhoService {
  constructor(private readonly repository: PostoTrabalhoRepository) {}

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new NotFoundException('A empresa informada não existe.');
      }
    }
    throw error;
  }

  /**
   * Cria um posto de trabalho vinculado a uma empresa existente.
   * @throws NotFoundException se o empresaId informado não existir.
   */
  async create(dto: CreatePostoTrabalhoDto) {
    try {
      return await this.repository.create(dto);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  findAll() {
    return this.repository.findAll();
  }

  /**
   * Busca um posto pelo id.
   * @throws NotFoundException se não existir.
   */
  async findOne(id: number) {
    const posto = await this.repository.findById(id);
    if (!posto) {
      throw new NotFoundException(
        `Posto de trabalho com id ${id} não encontrado.`,
      );
    }
    return posto;
  }

  async update(id: number, dto: UpdatePostoTrabalhoDto) {
    await this.findOne(id);
    try {
      return await this.repository.update(id, dto);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Exclui um posto de trabalho.
   * @throws ConflictException se houver escalas vinculadas ao posto.
   */
  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // Aqui o P2003 tem outro significado: não é "empresa inexistente",
      // é o onDelete: Restrict do schema impedindo apagar um posto que
      // ainda tem escalas. Mesmo código de erro, causa oposta — por isso
      // não reaproveitamos handlePrismaError, e devolvemos 409 (conflito
      // de estado) em vez de 404.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: existem escalas vinculadas a este posto.',
        );
      }
      throw error;
    }
  }
}
