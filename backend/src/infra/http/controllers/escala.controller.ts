import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { EscalaService } from '../../../domain/services/escala.service';
import { GeracaoEscalaService } from '../../../domain/services/geracao-escala.service';
import { RegrasTrabalhistasService } from '../../../domain/services/regras-trabalhistas.service';
import { EscalaPdfService } from '../../../domain/services/escala-pdf.service';
import { CreateEscalaDto } from '../dtos/escala/create-escala.dto';
import { GerarEscalaAutomaticaDto } from '../dtos/escala/gerar-escala-automatica.dto';
import { EscalaPresenter } from '../presenters/escala.presenter';
import { AlocacaoPresenter } from '../presenters/alocacao.presenter';

// @Controller('escalas') = todas as rotas começam com /escalas.
// Além do CRUD básico, expõe as pontas dos casos de uso do documento:
//   POST /escalas/gerar-automatica -> UC05 (gera a escala)
//   GET  /escalas/:id/validar      -> UC06 (revalida uma escala existente)
//   GET  /escalas/:id/pdf          -> UC08 (exporta a escala em PDF)
@Controller('escalas')
export class EscalaController {
  constructor(
    private readonly service: EscalaService,
    private readonly geracao: GeracaoEscalaService,
    private readonly regras: RegrasTrabalhistasService,
    private readonly pdf: EscalaPdfService,
  ) {}

  @Post()
  async create(@Body() dto: CreateEscalaDto) {
    const escala = await this.service.create(dto);
    return EscalaPresenter.toHTTP(escala);
  }

  @Post('gerar-automatica')
  async gerarAutomatica(@Body() dto: GerarEscalaAutomaticaDto) {
    const resultado = await this.geracao.gerarAutomatica(dto);
    return {
      ...resultado,
      escala: EscalaPresenter.toHTTP(resultado.escala),
      alocacoesCriadas: resultado.alocacoesCriadas.map((a) =>
        AlocacaoPresenter.toHTTP(a),
      ),
    };
  }

  @Get()
  async findAll() {
    const escalas = await this.service.findAll();
    return escalas.map((e) => EscalaPresenter.toHTTP(e));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const escala = await this.service.findOne(id);
    return EscalaPresenter.toHTTP(escala);
  }

  @Get(':id/validar')
  validar(@Param('id', ParseIntPipe) id: number) {
    return this.regras.validarEscalaExistente(id);
  }

  // @Res() entrega o controle total da resposta HTTP pro controller —
  // preciso disso aqui porque o retorno não é JSON, é um binário com
  // Content-Type próprio. É a única rota do sistema que faz isso.
  @Get(':id/pdf')
  async gerarPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdf.gerar(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="escala-${id}.pdf"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
