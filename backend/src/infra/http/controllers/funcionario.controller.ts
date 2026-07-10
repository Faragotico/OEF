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
import { FuncionarioService } from '../../../domain/services/funcionario.service';
import { CreateFuncionarioDto } from '../dtos/create-funcionario.dto';
import { UpdateFuncionarioDto } from '../dtos/update-funcionario.dto';

// O controller é a PORTA DE ENTRADA HTTP. O trabalho dele é só:
// receber a requisição, extrair os dados, e chamar o service.
// Ele não tem nenhuma regra de negócio — repare como cada método
// é uma linha só delegando pro service.
// @Controller('funcionarios') = todas as rotas começam com /funcionarios
@Controller('funcionarios')
export class FuncionarioController {
  constructor(private readonly service: FuncionarioService) {}

  @Post() // POST /funcionarios
  create(@Body() dto: CreateFuncionarioDto) {
    return this.service.create(dto);
  }

  @Get() // GET /funcionarios
  findAll() {
    return this.service.findAll();
  }

  @Get(':id') // GET /funcionarios/3
  // ParseIntPipe converte o "3" da URL (que é texto) em número 3,
  // e recusa com erro 400 se vier algo que não é número.
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id') // PATCH /funcionarios/3
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuncionarioDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id') // DELETE /funcionarios/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
