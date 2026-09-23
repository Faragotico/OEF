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

// @Controller('escalas') = todas as rotas começam com /escalas.
// Além do CRUD básico, expõe as pontas dos casos de uso do documento:
//   POST /escalas/gerar-automatica -> UC05 (gera a escala)
//   POST /escalas/simular          -> UC05 sem gravar (prévia)
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
      escala: resultado.escala ? EscalaPresenter.toHTTP(resultado.escala) : null,
    };
  }

  // Mesma geração, sem gravar nada. Existe como rota própria (e não só
  // como campo no corpo) porque é semanticamente um GET caro: o gestor
  // pode chamar à vontade pra comparar padrões de rodízio antes de
  // escolher, sem deixar rastro no banco nem esbarrar na checagem de
  // escala sobreposta.
  @Post('simular')
  async simular(@Body() dto: GerarEscalaAutomaticaDto) {
    const resultado = await this.geracao.gerarAutomatica({ ...dto, simular: true });
    return { ...resultado, escala: null };
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
    const { buffer, nomeArquivo } = await this.pdf.gerar(id);
    res.setHeader('Content-Type', 'application/pdf');
    // O nome vem do posto e do período ("Matriz 01-04-26 a 30-04-26.pdf"),
    // não do id: é o que o gestor procura na pasta de downloads.
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
