import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmpresaRepository } from '../repositories/empresa.repository';
import { CreateEmpresaDto } from 'src/infra/http/dtos/empresa/create-empresa.dto';
import { UpdateEmpresaDto } from 'src/infra/http/dtos/empresa/update-empresa.dto';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Repare: ele não sabe o que é uma requisição HTTP (isso é
// do controller) nem como o banco funciona (isso é do repository).
// Ele só orquestra: "confere isso, se ok manda o repository salvar".
@Injectable()
export class EmpresaService {
  constructor(private readonly repository: EmpresaRepository) {}

  async create(dto: CreateEmpresaDto) {
    // Regra de negócio: Cnpj é único. Checamos ANTES de tentar salvar
    // pra dar uma mensagem clara (o banco também barraria, mas com
    // erro feio). Esta é a lógica que NÃO deveria estar no controller.
    const existente = await this.repository.findByCnpj(dto.cnpj);
    if (existente) {
      throw new ConflictException('Já existe uma empresa com esse cnpj.');
    }
    return this.repository.create(dto);
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const empresa = await this.repository.findById(id);
    if (!empresa) {
      throw new NotFoundException(`Empresa com id ${id} não encontrada.`);
    }
    return empresa;
  }

  async update(id: number, dto: UpdateEmpresaDto) {
    await this.findOne(id); // reaproveita a checagem de existência

    // Se estiver mudando o CNPJ, garante que não colide com outro
    if (dto.cnpj) {
      const outro = await this.repository.findByCnpj(dto.cnpj);
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe outra empresa com este CNPJ.');
      }
    }
    return this.repository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id); // garante que existe antes de apagar
    return this.repository.delete(id);
  }
}
