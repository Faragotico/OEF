import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { CreateFuncionarioDto } from '../../infra/http/dtos/create-funcionario.dto';
import { UpdateFuncionarioDto } from '../../infra/http/dtos/update-funcionario.dto';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Repare: ele não sabe o que é uma requisição HTTP (isso é
// do controller) nem como o banco funciona (isso é do repository).
// Ele só orquestra: "confere isso, se ok manda o repository salvar".
@Injectable()
export class FuncionarioService {
  constructor(private readonly repository: FuncionarioRepository) {}

  async create(dto: CreateFuncionarioDto) {
    // Regra de negócio: CPF é único. Checamos ANTES de tentar salvar
    // pra dar uma mensagem clara (o banco também barraria, mas com
    // erro feio). Esta é a lógica que NÃO deveria estar no controller.
    const existente = await this.repository.findByCpf(dto.cpf);
    if (existente) {
      throw new ConflictException('Já existe um funcionário com este CPF.');
    }
    return this.repository.create(dto);
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const funcionario = await this.repository.findById(id);
    if (!funcionario) {
      throw new NotFoundException(`Funcionário com id ${id} não encontrado.`);
    }
    return funcionario;
  }

  async update(id: number, dto: UpdateFuncionarioDto) {
    await this.findOne(id); // reaproveita a checagem de existência

    // Se estiver mudando o CPF, garante que não colide com outro
    if (dto.cpf) {
      const outro = await this.repository.findByCpf(dto.cpf);
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe outro funcionário com este CPF.');
      }
    }
    return this.repository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id); // garante que existe antes de apagar
    return this.repository.delete(id);
  }
}
