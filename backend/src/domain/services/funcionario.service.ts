import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { TurnoRepository } from '../repositories/turno.repository';
import { PostoTrabalhoRepository } from '../repositories/posto-trabalho.repository';
import { CargoRepository } from '../repositories/cargo.repository';
import { CreateFuncionarioDto } from '../../infra/http/dtos/funcionario/create-funcionario.dto';
import { UpdateFuncionarioDto } from '../../infra/http/dtos/funcionario/update-funcionario.dto';
import { FindFuncionariosQueryDto } from '../../infra/http/dtos/funcionario/find-funcionarios-query.dto';

// O service é o CÉREBRO. Ele aplica as regras de negócio e decide o
// que fazer. Não sabe o que é uma requisição HTTP (isso é do
// controller) nem como o banco funciona (isso é do repository).
@Injectable()
export class FuncionarioService {
  constructor(
    private readonly repository: FuncionarioRepository,
    private readonly turnoRepository: TurnoRepository,
    private readonly postoTrabalhoRepository: PostoTrabalhoRepository,
    private readonly cargoRepository: CargoRepository,
  ) {}

  async create(dto: CreateFuncionarioDto) {
    // Regra de negócio: CPF é único. Checamos ANTES de tentar salvar
    // pra dar uma mensagem clara (o banco também barraria, mas com
    // erro feio).
    const existente = await this.repository.findByCpf(dto.cpf);
    if (existente) {
      throw new ConflictException('Já existe um funcionário com este CPF.');
    }

    await this.validarTurno(dto.turnoPadraoId);
    await this.validarPosto(dto.postoId);
    await this.validarCargo(dto.cargoId);
    const habilitacoes = await this.validarHabilitacoes(dto.turnosHabilitadosIds);

    const { turnosHabilitadosIds, ...dados } = dto;
    return this.repository.create({
      ...dados,
      diasSemanaVetados: dto.diasSemanaVetados ?? [],
      habilitacoes: { create: habilitacoes.map((turnoId) => ({ turnoId })) },
    });
  }

  // Lista completa (sem paginar): só pra preencher dropdowns e telas
  // que precisam de todos os nomes (ausências, alocações, escalas).
  findAll() {
    return this.repository.findAll();
  }

  // Monta o filtro (where do Prisma) a partir da query string e busca
  // só a página pedida — ver FuncionarioRepository.findAllPaginado.
  async findAllPaginado(query: FindFuncionariosQueryDto) {
    const page = query.page ?? 1;
    // trim() tira espaços das pontas; "" (busca vazia) vira "sem filtro".
    const busca = query.busca?.trim();
    // Padrão: só ativos. É o que o gestor quer ver no dia a dia; quem
    // saiu aparece escolhendo "Inativos" ou "Todos".
    const status = query.status ?? 'ativo';

    const where: Prisma.FuncionarioWhereInput = {};

    if (status === 'ativo') where.status = true;
    if (status === 'inativo') where.status = false;

    if (query.postoId !== undefined) {
      where.postoId = query.postoId;
    }

    if (busca) {
      // Uma caixa de busca, quatro colunas: basta UMA bater (OR).
      const condicoes: Prisma.FuncionarioWhereInput[] = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { cargo: { nome: { contains: busca, mode: 'insensitive' } } },
        { telefone: { contains: busca, mode: 'insensitive' } },
      ];

      // O CPF é guardado só com dígitos. Se a pessoa digitar
      // "394.284", tiramos a pontuação pra casar com o banco. Só entra
      // na busca se sobrou algo: contains "" casa com TUDO.
      const cpfBusca = busca.replace(/\D/g, '');
      if (cpfBusca) {
        condicoes.push({ cpf: { contains: cpfBusca } });
      }

      where.OR = condicoes;
    }

    const { data, total } = await this.repository.findAllPaginado(where, page);

    return {
      data,
      total,
      page,
      // Math.max(1, ...) pra lista vazia mostrar "página 1 de 1".
      totalPaginas: Math.max(
        1,
        Math.ceil(total / FuncionarioRepository.POR_PAGINA),
      ),
    };
  }

  async findOne(id: number) {
    const funcionario = await this.repository.findById(id);
    if (!funcionario) {
      throw new NotFoundException(`Funcionário com id ${id} não encontrado.`);
    }
    return funcionario;
  }

  async update(id: number, dto: UpdateFuncionarioDto) {
    await this.findOne(id);

    if (dto.cpf) {
      const outro = await this.repository.findByCpf(dto.cpf);
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe outro funcionário com este CPF.');
      }
    }

    await this.validarTurno(dto.turnoPadraoId);
    await this.validarPosto(dto.postoId);
    await this.validarCargo(dto.cargoId);

    const { turnosHabilitadosIds, ...dados } = dto;

    // Habilitação é uma lista: quando ela vem no corpo, substitui a que
    // estava lá (deleteMany + create), porque um PATCH que só
    // acrescentasse não teria como REMOVER uma habilitação.
    if (turnosHabilitadosIds === undefined) {
      return this.repository.update(id, dados);
    }
    const habilitacoes = await this.validarHabilitacoes(turnosHabilitadosIds);
    return this.repository.update(id, {
      ...dados,
      habilitacoes: {
        deleteMany: {},
        create: habilitacoes.map((turnoId) => ({ turnoId })),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.repository.delete(id);
    } catch (error) {
      // P2003 aqui é o onDelete: Restrict do schema — Alocacao e
      // Ausencia (histórico trabalhista) apontam pra este funcionário e
      // bloqueiam a exclusão.
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

  private async validarPosto(postoId?: number) {
    if (!postoId) return;
    const posto = await this.postoTrabalhoRepository.findById(postoId);
    if (!posto) {
      throw new NotFoundException(
        `Posto de trabalho com id ${postoId} não encontrado.`,
      );
    }
  }

  private async validarCargo(cargoId?: number | null) {
    if (!cargoId) return;
    const cargo = await this.cargoRepository.findById(cargoId);
    if (!cargo) {
      throw new NotFoundException(`Cargo com id ${cargoId} não encontrado.`);
    }
  }

  private async validarTurno(turnoId?: number) {
    if (!turnoId) return;
    const turno = await this.turnoRepository.findById(turnoId);
    if (!turno) {
      throw new NotFoundException(`Turno com id ${turnoId} não encontrado.`);
    }
  }

  /**
   * Confere que todo turno habilitado existe, e tira as repetições.
   *
   * O turno padrão não precisa ser listado aqui: ele já é habilitação
   * por definição, e o motor faz a união dos dois. Listar mesmo assim
   * não faz mal.
   */
  private async validarHabilitacoes(ids?: number[]): Promise<number[]> {
    if (!ids?.length) return [];
    const unicos = [...new Set(ids)];
    for (const id of unicos) {
      const turno = await this.turnoRepository.findById(id);
      if (!turno) {
        throw new BadRequestException(
          `Turno com id ${id} (em turnosHabilitadosIds) não encontrado.`,
        );
      }
    }
    return unicos;
  }
}
