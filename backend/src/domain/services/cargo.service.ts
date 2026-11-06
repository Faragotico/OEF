import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CargoRepository } from '../repositories/cargo.repository';
import { CargoDto } from 'src/infra/http/dtos/cargo/cargo.dto';

// Regras dos cargos: nome único (sem diferenciar maiúscula) e não
// apagar cargo que algum funcionário ainda usa.
@Injectable()
export class CargoService {
  constructor(private readonly repository: CargoRepository) {}

  async create(dto: CargoDto) {
    const nome = normalizarNome(dto.nome);
    await this.garantirNomeLivre(nome);
    return this.repository.create(nome);
  }

  async findAll(busca?: string) {
    const cargos = await this.repository.findAll(busca?.trim() || undefined);
    return cargos.map(({ _count, ...cargo }) => ({
      ...cargo,
      funcionarios: _count.funcionarios,
    }));
  }

  async findOne(id: number) {
    const cargo = await this.repository.findById(id);
    if (!cargo) {
      throw new NotFoundException(`Cargo com id ${id} não encontrado.`);
    }
    return cargo;
  }

  async update(id: number, dto: CargoDto) {
    await this.findOne(id);
    const nome = normalizarNome(dto.nome);
    await this.garantirNomeLivre(nome, id);
    return this.repository.update(id, nome);
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // P2003 = a FK NoAction de funcionario.id_cargo barrou: o cargo
      // está em uso. Vira mensagem clara em vez de um 500 cru.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: há funcionários com este cargo. Troque o cargo deles antes.',
        );
      }
      throw error;
    }
  }

  private async garantirNomeLivre(nome: string, idAtual?: number) {
    const existente = await this.repository.findByNome(nome);
    if (existente && existente.id !== idAtual) {
      throw new ConflictException(`O cargo "${existente.nome}" já existe.`);
    }
  }
}

// Tira espaços sobrando ("  Porteiro   noturno " -> "Porteiro noturno").
function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}
