import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { TurnoRepository } from '../repositories/turno.repository';
import { CreateFuncionarioDto } from '../../infra/http/dtos/funcionario/create-funcionario.dto';
import { UpdateFuncionarioDto } from '../../infra/http/dtos/funcionario/update-funcionario.dto';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Repare: ele não sabe o que é uma requisição HTTP (isso é
// do controller) nem como o banco funciona (isso é do repository).
// Ele só orquestra: "confere isso, se ok manda o repository salvar".
@Injectable()
export class FuncionarioService {
  constructor(
    private readonly repository: FuncionarioRepository,
    private readonly turnoRepository: TurnoRepository,
  ) {}

  async create(dto: CreateFuncionarioDto) {
    // Regra de negócio: CPF é único. Checamos ANTES de tentar salvar
    // pra dar uma mensagem clara (o banco também barraria, mas com
    // erro feio). Esta é a lógica que NÃO deveria estar no controller.
    const existente = await this.repository.findByCpf(dto.cpf);
    if (existente) {
      throw new ConflictException('Já existe um funcionário com este CPF.');
    }

    await this.validarTurnoPadrao(dto.turnoPadraoId);

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
        throw new ConflictException(
          'Já existe outro funcionário com este CPF.',
        );
      }
    }

    await this.validarTurnoPadrao(dto.turnoPadraoId);

    return this.repository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id); // garante que existe antes de apagar
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // P2003 aqui é o onDelete: Restrict do schema — Alocacao e
      // Ausencia (histórico trabalhista) apontam pra este funcionário
      // e bloqueiam a exclusão. Sem este catch, o Nest devolvia um 500
      // com o erro cru do Prisma em vez de uma mensagem que o gestor
      // entende. Mesmo padrão do PostoTrabalho e do Turno.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir: existem alocações ou ausências vinculadas a este funcionário.',
        );
      }
      throw error;
    }
  }

  // Confere se o turno informado como padrão realmente existe, antes
  // de deixar o Prisma tentar gravar um FK que não existe (e devolver
  // um erro 500 feio de constraint violada).
  private async validarTurnoPadrao(turnoPadraoId?: number) {
    if (!turnoPadraoId) return;
    const turno = await this.turnoRepository.findById(turnoPadraoId);
    if (!turno) {
      throw new NotFoundException(
        `Turno com id ${turnoPadraoId} não encontrado.`,
      );
    }
  }
}
