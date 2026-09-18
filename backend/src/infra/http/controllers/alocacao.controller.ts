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
import { CreateAlocacaoDto } from '../dtos/alocacao/create-alocacao.dto';
import { UpdateAlocacaoDto } from '../dtos/alocacao/update-alocacao.dto';
import { FindAlocacoesQueryDto } from '../dtos/alocacao/find-alocacoes-query.dto';
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

  // Filtros e página vêm todos como query string:
  // GET /alocacoes?funcionarioId=3&page=2. Sem nenhum, ainda pagina —
  // ver o comentário em AlocacaoService.findAll.
  @Get()
  async findAll(@Query() query: FindAlocacoesQueryDto) {
    const { data, total, page, totalPaginas } =
      await this.service.findAll(query);
    return {
      data: data.map((alocacao) => AlocacaoPresenter.toHTTP(alocacao)),
      total,
      page,
      totalPaginas,
    };
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
