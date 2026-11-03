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
import { PostoTrabalhoService } from 'src/domain/services/posto-trabalho.service';
import { CreatePostoTrabalhoDto } from '../dtos/posto-trabalho/create-posto-trabalho.dto';
import { UpdatePostoTrabalhoDto } from '../dtos/posto-trabalho/update-posto-trabalho.dto';
import { FindPostosQueryDto } from '../dtos/posto-trabalho/find-postos-query.dto';

// O controller é a PORTA DE ENTRADA HTTP. O trabalho dele é só:
// receber a requisição, extrair os dados, e chamar o service.
// Ele não tem nenhuma regra de negócio — repare como cada método
// é uma linha só delegando pro service.
// @Controller('postos') = todas as rotas começam com /postos
@Controller('postos')
export class PostoTrabalhoController {
  constructor(private readonly service: PostoTrabalhoService) {}

  @Post() // POST /postos
  create(@Body() dto: CreatePostoTrabalhoDto) {
    return this.service.create(dto);
  }

  // Lista paginada + filtros: GET /postos?busca=centro&empresaId=3&page=2
  @Get()
  findAll(@Query() query: FindPostosQueryDto) {
    return this.service.findAllPaginado(query);
  }

  // Lista COMPLETA (sem paginar), só pra preencher dropdowns (turnos,
  // funcionários, gerar escala). Precisa vir ANTES de @Get(':id'),
  // senão o Nest trataria "opcoes" como um id.
  @Get('opcoes')
  opcoes() {
    return this.service.findAll();
  }

  @Get(':id') // GET /postos/3
  // ParseIntPipe converte o "3" da URL (que é texto) em número 3,
  // e recusa com erro 400 se vier algo que não é número.
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id') // PATCH /postos/3
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostoTrabalhoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id') // DELETE /postos/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
