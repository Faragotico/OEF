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

@Controller('alocacoes')
export class AlocacaoController {
  constructor(private readonly service: AlocacaoService) {}

  @Post()
  create(@Body() dto: CreateAlocacaoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlocacaoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
