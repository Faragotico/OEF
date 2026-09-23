import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAlocacaoDto } from 'src/infra/http/dtos/alocacao/create-alocacao.dto';
import { UpdateAlocacaoDto } from 'src/infra/http/dtos/alocacao/update-alocacao.dto';
import { FindAlocacoesQueryDto } from 'src/infra/http/dtos/alocacao/find-alocacoes-query.dto';
import { AlocacaoRepository } from '../repositories/alocacao.repository';
import { Prisma } from '@prisma/client';
import { RegrasTrabalhistasService } from './regras-trabalhistas.service';
import { TurnoService } from './turno.service';
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
    private readonly turnoService: TurnoService,
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

  // Resolve o turnoId EFETIVO da alocação a partir do que veio no DTO:
  // ou o cliente mandou turnoId (turno já cadastrado), ou mandou
  // horaInicio+horaFim (horário personalizado — acha ou cria um Turno
  // com esse horário exato). Os dois juntos, ou nenhum dos dois sem um
  // valor existente pra cair de volta (update), é erro.
  //
  // `turnoIdExistente` só é passado pelo update: é o turnoId que já
  // estava salvo, usado quando o PATCH não mexe nem em turnoId nem em
  // horaInicio/horaFim (edição parcial de outro campo qualquer).
  private async resolverTurnoId(
    dto: { turnoId?: number; horaInicio?: string; horaFim?: string },
    turnoIdExistente?: number,
  ): Promise<number> {
    const temHorarioPersonalizado =
      dto.horaInicio !== undefined || dto.horaFim !== undefined;

    if (dto.turnoId !== undefined && temHorarioPersonalizado) {
      throw new BadRequestException(
        'Informe turnoId OU horaInicio/horaFim — não os dois juntos.',
      );
    }

    if (temHorarioPersonalizado) {
      if (!dto.horaInicio || !dto.horaFim) {
        throw new BadRequestException(
          'Horário personalizado precisa de horaInicio e horaFim juntos.',
        );
      }
      return this.turnoService.encontrarOuCriarPorHorario(
        dto.horaInicio,
        dto.horaFim,
      );
    }

    if (dto.turnoId !== undefined) {
      return dto.turnoId;
    }

    if (turnoIdExistente !== undefined) {
      return turnoIdExistente;
    }

    throw new BadRequestException(
      'turnoId é obrigatório (ou horaInicio/horaFim, pra horário personalizado).',
    );
  }

  async create(dto: CreateAlocacaoDto) {
    const data = normalizeDate(dto.data);
    const turnoId = await this.resolverTurnoId(dto);

    // Antes de gravar, confere só o que é estrutural: funcionário/
    // turno/escala existem (FK → 404), a data está dentro do período
    // da escala (RN03 → 400), e o funcionário não está alocado em
    // outro lugar nesse mesmo dia (conflito → 409). As regras
    // TRABALHISTAS (RN04-RN07) não bloqueiam uma edição manual — ver
    // o comentário em RegrasTrabalhistasService.validarOuLancar; pra
    // isso existe "Validar escala" (UC06), que reexamina depois sem
    // travar nada.
    await this.regras.validarOuLancar({
      funcionarioId: dto.funcionarioId,
      data,
      turnoId,
      escalaId: dto.escalaId,
    });

    try {
      return await this.repository.create({
        data,
        funcionarioId: dto.funcionarioId,
        escalaId: dto.escalaId,
        turnoId,
        ehSubstituido: dto.ehSubstituido,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  // Monta o filtro (where do Prisma) a partir da query string e busca
  // só a página pedida — ver AlocacaoRepository.findAllPaginado. Sem
  // filtro nenhum, ainda pagina (não existe mais "trazer tudo").
  async findAll(query: FindAlocacoesQueryDto) {
    const where: Prisma.AlocacaoWhereInput = {};

    if (query.funcionarioId !== undefined) {
      where.funcionarioId = query.funcionarioId;
    }
    if (query.turnoId !== undefined) {
      where.turnoId = query.turnoId;
    }
    if (query.escalaId !== undefined) {
      where.escalaId = query.escalaId;
    }
    if (query.substituido === 'sim') {
      where.ehSubstituido = true;
    } else if (query.substituido === 'nao') {
      where.ehSubstituido = false;
    }
    if (query.dataInicio || query.dataFim) {
      where.data = {
        ...(query.dataInicio ? { gte: normalizeDate(query.dataInicio) } : {}),
        ...(query.dataFim ? { lte: normalizeDate(query.dataFim) } : {}),
      };
    }

    const { data, total } = await this.repository.findAllPaginado(
      where,
      query.page ?? 1,
    );

    return {
      data,
      total,
      page: query.page ?? 1,
      totalPaginas: Math.max(1, Math.ceil(total / AlocacaoRepository.POR_PAGINA)),
    };
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
    const turnoId = await this.resolverTurnoId(dto, existente.turnoId);

    await this.regras.validarOuLancar({
      funcionarioId: dto.funcionarioId ?? existente.funcionarioId,
      data,
      turnoId,
      escalaId: dto.escalaId ?? existente.escalaId,
      ignorarAlocacaoId: id,
    });

    try {
      return await this.repository.update(id, {
        funcionarioId: dto.funcionarioId,
        escalaId: dto.escalaId,
        turnoId,
        ehSubstituido: dto.ehSubstituido,
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
