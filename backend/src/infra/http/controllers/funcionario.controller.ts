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
import { CreateFuncionarioDto } from '../dtos/funcionario/create-funcionario.dto';
import { UpdateFuncionarioDto } from '../dtos/funcionario/update-funcionario.dto';
import { FuncionarioPresenter } from '../presenters/funcionario.presenter';

// O controller é a PORTA DE ENTRADA HTTP. O trabalho dele é só:
// receber a requisição, extrair os dados, e chamar o service.
// Ele não tem nenhuma regra de negócio — repare como cada método
// é uma linha só delegando pro service.
// @Controller('funcionarios') = todas as rotas começam com /funcionarios
@Controller('funcionarios')
export class FuncionarioController {
  constructor(private readonly service: FuncionarioService) {}

  @Post() // POST /funcionarios
  async create(@Body() dto: CreateFuncionarioDto) {
    const funcionario = await this.service.create(dto);
    return FuncionarioPresenter.toHTTP(funcionario);
  }

  @Get() // GET /funcionarios
  async findAll() {
    const funcionarios = await this.service.findAll();
    return funcionarios.map((f) => FuncionarioPresenter.toHTTP(f));
  }

  @Get(':id') // GET /funcionarios/3
  // ParseIntPipe converte o "3" da URL (que é texto) em número 3,
  // e recusa com erro 400 se vier algo que não é número.
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const funcionario = await this.service.findOne(id);
    return FuncionarioPresenter.toHTTP(funcionario);
  }

  @Patch(':id') // PATCH /funcionarios/3
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFuncionarioDto,
  ) {
    const funcionario = await this.service.update(id, dto);
    return FuncionarioPresenter.toHTTP(funcionario);
  }

  @Delete(':id') // DELETE /funcionarios/3
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
