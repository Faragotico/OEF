import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TurnoService } from 'src/domain/services/turno.service';
import { CreateTurnoDto } from '../dtos/turno/create-turno.dto';
import { UpdateTurnoDto } from '../dtos/turno/update-turno.dto';
import { FindTurnosQueryDto } from '../dtos/turno/find-turnos-query.dto';
import { TurnoPresenter } from '../presenters/turno.presenter';

// O controller é a PORTA DE ENTRADA HTTP. Ele só recebe a requisição,
// extrai os dados e chama o service. Sem nenhuma regra de negócio.
// @Controller('turnos') = todas as rotas começam com /turnos
@Controller('turnos')
export class TurnoController {
  constructor(private readonly service: TurnoService) {}

  @Post()
  async create(@Body() dto: CreateTurnoDto) {
    const turno = await this.service.create(dto);
    return TurnoPresenter.toHTTP(turno!);
  }

  // Lista paginada + filtros: GET /turnos?busca=manha&postoId=3&page=2
  @Get()
  async findAll(@Query() query: FindTurnosQueryDto) {
    const { data, total, page, totalPaginas } =
      await this.service.findAllPaginado(query);
    return {
      data: data.map((turno) => TurnoPresenter.toHTTP(turno)),
      total,
      page,
      totalPaginas,
    };
  }

  // Lista COMPLETA (sem paginar), pra dropdowns e telas que precisam
  // da grade inteira. ?postoId=3 devolve só a grade daquele posto — é o
  // que a tela de geração precisa pra mostrar de quanta gente o posto
  // precisa em cada dia antes de gerar. Precisa vir ANTES de
  // @Get(':id'), senão o Nest trataria "opcoes" como um id.
  @Get('opcoes')
  async opcoes(@Query('postoId') postoId?: string) {
    const turnos = postoId
      ? await this.service.findByPosto(Number(postoId))
      : await this.service.findAll();
    return turnos.map((turno) => TurnoPresenter.toHTTP(turno));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const turno = await this.service.findOne(id);
    return TurnoPresenter.toHTTP(turno);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTurnoDto,
  ) {
    const turno = await this.service.update(id, dto);
    return TurnoPresenter.toHTTP(turno!);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const turno = await this.service.remove(id);
    return TurnoPresenter.toHTTP(turno);
  }
}
