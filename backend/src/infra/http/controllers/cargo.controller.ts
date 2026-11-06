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
import { CargoService } from 'src/domain/services/cargo.service';
import { CargoDto } from '../dtos/cargo/cargo.dto';

// /cargos — lista curta (dezenas, não milhares), por isso sem paginação:
// a mesma rota serve à tela de cargos e ao dropdown do funcionário.
@Controller('cargos')
export class CargoController {
  constructor(private readonly service: CargoService) {}

  @Post()
  create(@Body() dto: CargoDto) {
    return this.service.create(dto);
  }

  // GET /cargos?busca=port
  @Get()
  findAll(@Query('busca') busca?: string) {
    return this.service.findAll(busca);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CargoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
