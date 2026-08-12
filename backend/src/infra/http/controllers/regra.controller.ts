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
import { RegraService } from 'src/domain/services/regra.service';
import { CreateRegraDto } from '../dtos/regra/create-regra.dto';
import { UpdateRegraDto } from '../dtos/regra/update-regra.dto';

// O controller é a PORTA DE ENTRADA HTTP. Ele só recebe a requisição,
// extrai os dados e chama o service. Sem nenhuma regra de negócio.
// @Controller('regras') = todas as rotas começam com /regras
@Controller('regras')
export class RegraController {
  constructor(private readonly service: RegraService) {}

  @Post() // POST /regras
  create(@Body() dto: CreateRegraDto) {
    return this.service.create(dto);
  }

  @Get() // GET /regras
  findAll() {
    return this.service.findAll();
  }

  @Get(':id') // GET /regras/3
  // ParseIntPipe converte o "3" da URL (texto) em número, e recusa com
  // 400 se vier algo que não é número.
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id') // PATCH /regras/3
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegraDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id') // DELETE /regras/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
