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
import { CreateAlocacaoDto } from '../dtos/create-alocacao.dto';
import { UpdateAlocacaoDto } from '../dtos/update-alocacao.dto';
import { AlocacaoService } from 'src/domain/services/alocacao.service';
import { AlocacaoPresenter } from '../presenters/alocacao.presenter';

@Controller('alocacoes')
export class AlocacaoController {
  constructor(private readonly service: AlocacaoService) {}

  @Post()
  async create(@Body() dto: CreateAlocacaoDto) {
    const alocacao = await this.service.create(dto);
    return AlocacaoPresenter.toHTTP(alocacao);
  }

  @Get()
  async findAll() {
    const alocacoes = await this.service.findAll();
    return alocacoes.map((alocacao) => AlocacaoPresenter.toHTTP(alocacao));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const alocacao = await this.service.findOne(id);
    return AlocacaoPresenter.toHTTP(alocacao);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlocacaoDto,
  ) {
    const alocacao = await this.service.update(id, dto);
    return AlocacaoPresenter.toHTTP(alocacao);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const alocacao = await this.service.remove(id);
    return AlocacaoPresenter.toHTTP(alocacao);
  }
}
