import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegraRepository } from '../repositories/regra.repository';
import { CreateRegraDto } from 'src/infra/http/dtos/regra/create-regra.dto';
import { UpdateRegraDto } from 'src/infra/http/dtos/regra/update-regra.dto';

// O service é o CÉREBRO: aplica as regras de negócio e decide o que
// fazer. Não sabe o que é requisição HTTP (controller) nem como o
// banco funciona (repository).
@Injectable()
export class RegraService {
  constructor(private readonly repository: RegraRepository) {}

  // NOVO em relação ao PostoTrabalho: no schema há @@unique([tipo, valor]).
  // Ou seja, não pode existir duas regras com o MESMO tipo E o MESMO
  // valor. Quando o banco barra isso, o Prisma lança um erro de código
  // P2002. Aqui traduzimos esse erro técnico num 409 Conflict com
  // mensagem clara.
  //
  // (Empresa e Funcionário resolvem duplicidade com uma consulta prévia,
  //  antes de salvar. Aqui uso o outro caminho: deixo o banco barrar e
  //  trato o erro. Os dois são válidos; este evita uma consulta extra.)
  private handleUniqueError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe uma regra com esse tipo e valor.');
    }
    throw error;
  }

  async create(dto: CreateRegraDto) {
    try {
      return await this.repository.create(dto);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  findAll() {
    return this.repository.findAll();
  }

  /**
   * Busca uma regra pelo id.
   * @throws NotFoundException se não existir.
   */
  async findOne(id: number) {
    const regra = await this.repository.findById(id);
    if (!regra) {
      throw new NotFoundException(`Regra com id ${id} não encontrada.`);
    }
    return regra;
  }

  async update(id: number, dto: UpdateRegraDto) {
    await this.findOne(id); // reaproveita a checagem de existência
    try {
      return await this.repository.update(id, dto);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  /**
   * Exclui uma regra.
   * @throws ConflictException se houver escalas vinculadas à regra.
   */
  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // Aqui o P2003 significa: o onDelete: Restrict do schema está
      // impedindo apagar uma regra que ainda tem escalas vinculadas.
      // Devolvemos 409 (conflito de estado). Mesmo padrão do PostoTrabalho.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: existem escalas vinculadas a esta regra.',
        );
      }
      throw error;
    }
  }
}
