import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TurnoService } from 'src/domain/services/turno.service';
import { CreateTurnoDto } from '../dtos/turno/create-turno.dto';
import { UpdateTurnoDto } from '../dtos/turno/update-turno.dto';
import { TurnoPresenter } from '../presenters/turno.presenter';

// O controller é a PORTA DE ENTRADA HTTP. Ele só recebe a requisição,
// extrai os dados e chama o service. Sem nenhuma regra de negócio.
// @Controller('turno') = todas as rotas começam com /turno
@Controller('turno')
export class TurnoController {
  constructor(private readonly service: TurnoService) {}

  @Post()
  async create(@Body() dto: CreateTurnoDto) {
    const turno = await this.service.create(dto);
    return TurnoPresenter.toHTTP(turno);
  }

  @Get()
  async findAll() {
    const turnos = await this.service.findAll();
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
    return TurnoPresenter.toHTTP(turno);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const turno = await this.service.remove(id);
    return TurnoPresenter.toHTTP(turno);
  }
}
