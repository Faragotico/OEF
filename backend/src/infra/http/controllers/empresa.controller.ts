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
import { EmpresaService } from 'src/domain/services/empresa.service';
import { CreateEmpresaDto } from '../dtos/empresa/create-empresa.dto';
import { UpdateEmpresaDto } from '../dtos/empresa/update-empresa.dto';

// O controller é a PORTA DE ENTRADA HTTP. O trabalho dele é só:
// receber a requisição, extrair os dados, e chamar o service.
// Ele não tem nenhuma regra de negócio — repare como cada método
// é uma linha só delegando pro service.
// @Controller('empresas') = todas as rotas começam com /empresas
@Controller('empresas')
export class EmpresaController {
  constructor(private readonly service: EmpresaService) {}

  @Post() // POST /empresa
  create(@Body() dto: CreateEmpresaDto) {
    return this.service.create(dto);
  }

  @Get() // GET /empresa
  findAll() {
    return this.service.findAll();
  }

  @Get(':id') // GET /empresa/3
  // ParseIntPipe converte o "3" da URL (que é texto) em número 3,
  // e recusa com erro 400 se vier algo que não é número.
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id') // PATCH /empresa/3
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmpresaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') // DELETE /empresa/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
