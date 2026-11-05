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
import { AusenciaService } from '../../../domain/services/ausencia.service';
import { CreateAusenciaDto } from '../dtos/ausencia/create-ausencia.dto';
import { UpdateAusenciaDto } from '../dtos/ausencia/update-ausencia.dto';
import { FindAusenciasQueryDto } from '../dtos/ausencia/find-ausencias-query.dto';
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

  // Lista paginada + filtros:
  // GET /ausencias?busca=maria&dataInicio=2026-11-01&dataFim=2026-11-30&page=2
  @Get()
  async findAll(@Query() query: FindAusenciasQueryDto) {
    const { data, ...paginacao } = await this.service.findAllPaginado(query);
    return {
      ...paginacao,
      data: data.map((a) => AusenciaPresenter.toHTTP(a)),
    };
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
