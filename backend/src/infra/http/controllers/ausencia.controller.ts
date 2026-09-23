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
import { AusenciaService } from '../../../domain/services/ausencia.service';
import { CreateAusenciaDto } from '../dtos/ausencia/create-ausencia.dto';
import { UpdateAusenciaDto } from '../dtos/ausencia/update-ausencia.dto';
import { AusenciaPresenter } from '../presenters/ausencia.presenter';

// O controller é a PORTA DE ENTRADA HTTP. O trabalho dele é só:
// receber a requisição, extrair os dados, e chamar o service.
// @Controller('ausencias') = todas as rotas começam com /ausencias.
// É esta tela/rota que faltava pra RN02 (RegrasTrabalhistasService)
// ser acionável de verdade — antes, a regra existia no motor, mas
// nada no sistema permitia cadastrar uma ausência.
@Controller('ausencias')
export class AusenciaController {
  constructor(private readonly service: AusenciaService) {}

  @Post() // POST /ausencias
  async create(@Body() dto: CreateAusenciaDto) {
    const ausencia = await this.service.create(dto);
    return AusenciaPresenter.toHTTP(ausencia);
  }

  @Get() // GET /ausencias
  async findAll() {
    const ausencias = await this.service.findAll();
    return ausencias.map((a) => AusenciaPresenter.toHTTP(a));
  }

  @Get(':id') // GET /ausencias/3
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const ausencia = await this.service.findOne(id);
    return AusenciaPresenter.toHTTP(ausencia);
  }

  @Patch(':id') // PATCH /ausencias/3
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAusenciaDto,
  ) {
    const ausencia = await this.service.update(id, dto);
    return AusenciaPresenter.toHTTP(ausencia);
  }

  @Delete(':id') // DELETE /ausencias/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
