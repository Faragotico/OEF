import { Injectable, NotFoundException } from '@nestjs/common';
import { AusenciaRepository } from '../repositories/ausencia.repository';
import { FuncionarioRepository } from '../repositories/funcionario.repository';
import { CreateAusenciaDto } from '../../infra/http/dtos/ausencia/create-ausencia.dto';
import { UpdateAusenciaDto } from '../../infra/http/dtos/ausencia/update-ausencia.dto';
import { normalizeDate } from '../../helpers/date.helpers';

// O service é o CÉREBRO. Aplica as regras de negócio e decide o que
// fazer — aqui, principalmente, garantir que a ausência está mesmo
// ligada a um funcionário que existe antes de gravar. É esta tabela
// que a RN02 (RegrasTrabalhistasService) consulta pra nunca alocar
// alguém durante o período de ausência registrado.
@Injectable()
export class AusenciaService {
  constructor(
    private readonly repository: AusenciaRepository,
    private readonly funcionarioRepository: FuncionarioRepository,
  ) {}

  async create(dto: CreateAusenciaDto) {
    await this.validarFuncionario(dto.funcionarioId);

    return this.repository.create({
      funcionarioId: dto.funcionarioId,
      dataInic: normalizeDate(dto.dataInicio),
      dataFim: normalizeDate(dto.dataFim),
      motivo: dto.motivo,
      compensacao: dto.compensacao,
    });
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const ausencia = await this.repository.findById(id);
    if (!ausencia) {
      throw new NotFoundException(`Ausência com id ${id} não encontrada.`);
    }
    return ausencia;
  }

  async update(id: number, dto: UpdateAusenciaDto) {
    await this.findOne(id);
    if (dto.funcionarioId) {
      await this.validarFuncionario(dto.funcionarioId);
    }

    return this.repository.update(id, {
      ...(dto.funcionarioId && { funcionarioId: dto.funcionarioId }),
      ...(dto.dataInicio && { dataInic: normalizeDate(dto.dataInicio) }),
      ...(dto.dataFim && { dataFim: normalizeDate(dto.dataFim) }),
      ...(dto.motivo && { motivo: dto.motivo }),
      ...(dto.compensacao !== undefined && { compensacao: dto.compensacao }),
    });
  }

  async remove(id: number) {
    await this.findOne(id); // garante que existe antes de apagar
    return this.repository.delete(id);
  }

  // Confere se o funcionário informado realmente existe, antes de
  // deixar o Prisma tentar gravar uma FK inexistente (e devolver um
  // erro 500 feio de constraint violada).
  private async validarFuncionario(funcionarioId: number) {
    const funcionario = await this.funcionarioRepository.findById(funcionarioId);
    if (!funcionario) {
      throw new NotFoundException(
        `Funcionário com id ${funcionarioId} não encontrado.`,
      );
    }
  }
}
