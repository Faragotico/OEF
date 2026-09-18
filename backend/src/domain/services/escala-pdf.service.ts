import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Alocacao, Funcionario, Turno } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { RegrasTrabalhistasService } from './regras-trabalhistas.service';
import {
  diasDoPeriodo,
  ehFeriadoMaster,
  formatDate,
  formatTime,
  shiftDurationHours,
} from '../../helpers/date.helpers';

type AlocacaoComRelacoes = Alocacao & {
  funcionario: Funcionario & { turnoPadrao: Turno | null };
  turno: Turno;
};

// EscalaPdfService — UC08 "Gerar PDF".
//
// Igual à RegrasTrabalhistasService, este service lê direto do Prisma
// em vez de passar por um repository dedicado: ele não é "dono" de
// nenhuma entidade, só monta um relatório a partir do que já existe
// (Escala + Alocacao já salvas no banco). A grade dia x funcionário é
// a mesma leitura visual da tela (EscalaGrid no frontend): "." = turno
// padrão do titular, horário destacado = turno alterado/coringa,
// "FOLGA" = dia sem alocação.
// "Coringa" deixou de ser coluna do banco: é quem não tem horário de
// casa. Manter as duas coisas (uma coluna booleana E a ausência de
// turno padrão) era ter duas verdades sobre o mesmo fato, com uma
// podendo ficar desatualizada. Aqui a pergunta é feita direto ao dado
// que a define.
const ehCoringa = (f: { turnoPadraoId: number | null }) => f.turnoPadraoId === null;

@Injectable()
export class EscalaPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly regras: RegrasTrabalhistasService,
  ) {}

  async gerar(escalaId: number): Promise<Buffer> {
    const escala = await this.prisma.escala.findUnique({
      where: { id: escalaId },
      include: { posto: { include: { empresa: true } }, regra: true },
    });
    if (!escala) {
      throw new NotFoundException(`Escala com id ${escalaId} não encontrada.`);
    }

    const alocacoes = (await this.prisma.alocacao.findMany({
      where: { escalaId },
      include: {
        funcionario: { include: { turnoPadrao: true } },
        turno: true,
      },
      orderBy: { data: 'asc' },
    })) as AlocacaoComRelacoes[];

    // Mesmo intervalo intrajornada que o RN04 desconta — pra "horas no
    // período" mostrado aqui bater com o que o motor de validação usa
    // (ver RegrasTrabalhistasService.buscarIntervaloIntrajornada).
    const intervaloIntrajornada = await this.regras.buscarIntervaloIntrajornada();

    return this.montarPdf(escala, alocacoes, intervaloIntrajornada);
  }

  private montarPdf(
    escala: {
      id: number;
      dataInic: Date;
      dataFim: Date;
      posto: { nome: string; localizacao: string; empresa: { nome: string } };
      regra: { descricao: string; valor: string };
    },
    alocacoes: AlocacaoComRelacoes[],
    intervaloIntrajornada: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- cabeçalho ----
      // Compacto de propósito: era 1 linha de título + 5 linhas de
      // metadados (~80pt de altura) — sobrava pouco espaço pra tabela
      // e um mês de 30/31 dias vazava pra segunda página só por causa
      // disso. Juntando os metadados em 2 linhas (com "—" e "|" como
      // separador) cabe tudo numa página A4 só, que era o pedido.
      doc
        .fontSize(13)
        .fillColor('#dc2626')
        .text('OEF — Escala de Trabalho', { align: 'left' });
      doc.moveDown(0.2);
      doc.fontSize(8).fillColor('#000');
      doc.text(
        `Escala #${escala.id} — Posto: ${escala.posto.nome} — ${escala.posto.localizacao} — Empresa: ${escala.posto.empresa.nome}`,
      );
      doc.text(
        `Período: ${formatDate(escala.dataInic)} a ${formatDate(escala.dataFim)}   |   Regra de escala: ${escala.regra.descricao} (${escala.regra.valor})`,
      );
      doc.moveDown(0.3);

      const dias = diasDoPeriodo(escala.dataInic, escala.dataFim);

      // Funcionários com pelo menos uma alocação nesta escala, na mesma
      // ordem da tela: titulares por horário de início, coringas por
      // último.
      const funcionariosMap = new Map<number, Funcionario & { turnoPadrao: Turno | null }>();
      for (const a of alocacoes) funcionariosMap.set(a.funcionarioId, a.funcionario);
      const funcionarios = Array.from(funcionariosMap.values()).sort((a, b) => {
        if (ehCoringa(a) !== ehCoringa(b)) return ehCoringa(a) ? 1 : -1;
        const horaA = a.turnoPadrao ? formatTime(a.turnoPadrao.horaInicio) : '';
        const horaB = b.turnoPadrao ? formatTime(b.turnoPadrao.horaInicio) : '';
        return horaA.localeCompare(horaB);
      });

      if (funcionarios.length === 0) {
        doc.text('Esta escala ainda não tem alocações.');
        doc.end();
        return;
      }

      const alocacaoPorCelula = new Map<string, AlocacaoComRelacoes>();
      for (const a of alocacoes) {
        alocacaoPorCelula.set(`${a.funcionarioId}|${formatDate(a.data)}`, a);
      }

      // Pra distinguir, na coluna de um TITULAR, "folga normal" de
      // "folga que devia ter sido coberta por um coringa mas não foi"
      // (RN04/RN05/RN06 bloquearam todo coringa disponível naquele
      // dia — ver geracao-escala.service.ts): se existe QUALQUER
      // alocação naquele turno naquele dia (por outro funcionário, ou
      // seja, um coringa cobrindo), o turno "foi coberto"; se a coluna
      // do titular não tem alocação e ninguém mais cobriu o turno dele
      // naquele dia, a folga ficou descoberta. Isso é derivado 100% do
      // que já está salvo (Alocacao) — não depende de guardar o
      // coberturasPendentes da geração, que é efêmero (só existe na
      // resposta HTTP do momento da geração).
      const turnoCobertoNoDia = new Set<string>();
      for (const a of alocacoes) {
        turnoCobertoNoDia.add(`${a.turnoId}|${formatDate(a.data)}`);
      }

      // Total de horas EFETIVAMENTE trabalhadas no período, por
      // funcionário — soma a duração de CADA alocação dele nesta
      // escala (não só "dias trabalhados × turno padrão", porque o
      // coringa muda de turno todo dia e um titular pode ter tido
      // substituição pontual num turno diferente do padrão), já
      // descontando o intervalo intrajornada de cada turno (ex: turno
      // de 8h com 1h de almoço = 7h trabalhadas) — mesmo desconto que
      // o RN04 usa, pra não mostrar aqui um número que a validação
      // trabalhista não reconheceria. Mostrado no cabeçalho da coluna,
      // embaixo do turno.
      const horasPorFuncionario = new Map<number, number>();
      for (const a of alocacoes) {
        const horasTurno = Math.max(
          0,
          shiftDurationHours(a.turno) - intervaloIntrajornada,
        );
        horasPorFuncionario.set(
          a.funcionarioId,
          (horasPorFuncionario.get(a.funcionarioId) ?? 0) + horasTurno,
        );
      }
      const formatarHoras = (horas: number) => {
        const arredondado = Math.round(horas * 10) / 10;
        return `${arredondado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
      };

      // ---- grade dia x funcionário ----
      const margin = 30;
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const diaColWidth = 78;
      const colWidth = (pageWidth - margin * 2 - diaColWidth) / funcionarios.length;
      // 27 (não 20) porque o cabeçalho agora tem 3 linhas: nome, turno
      // e o total de horas no período.
      const headerRowHeight = 27;

      // Altura de linha pensada pra 1 MÊS por folha, não pra "caber
      // qualquer período numa página só" — dividir pelo número real de
      // dias faria uma escala de vários meses espremer cada linha até
      // ficar ilegível. Em vez disso, a conta assume o pior caso de um
      // mês (31 dias): reserva o cabeçalho compacto de cima (doc.y já
      // reflete a altura que ele ocupou), o cabeçalho de colunas da
      // tabela e a legenda/rodapé no final, e divide o resto por 31.
      // Um mês de 28/29/30 dias cabe com espaço de sobra na mesma
      // altura de linha; um período mais longo que um mês (vários
      // meses de uma vez) simplesmente pagina — cada página levando
      // ~1 mês — em vez de espremer tudo numa página só.
      const DIAS_POR_FOLHA_PADRAO = 31;
      // 48 (não 39) porque a legenda agora tem 4 linhas — a explicação
      // do FERIADO (feriado master, folga geral por padrão) ganhou
      // linha própria pra não ficar comprida demais e quebrar sozinha
      // (ver bloco de legenda/rodapé no final, que usa esse mesmo
      // espaço reservado).
      const legendaAltura = 48;
      const espacoParaLinhas =
        pageHeight - margin - doc.y - legendaAltura - headerRowHeight;
      const rowHeight = Math.max(
        10,
        Math.min(15, espacoParaLinhas / DIAS_POR_FOLHA_PADRAO),
      );
      const cellFontSize = Math.max(5.5, Math.min(7, colWidth / 11));
      // Deslocamento vertical do texto dentro da linha, pra ficar
      // centralizado independente da altura calculada acima.
      const offsetY = Math.max(1, (rowHeight - cellFontSize) / 2);

      let y = doc.y;

      function desenharCabecalhoColunas() {
        doc
          .rect(margin, y, diaColWidth, headerRowHeight)
          .fillAndStroke('#fee2e2', '#000');
        doc
          .fillColor('#000')
          .fontSize(7)
          .text('Dia', margin + 3, y + 6, { width: diaColWidth - 6 });

        funcionarios.forEach((f, i) => {
          const x = margin + diaColWidth + i * colWidth;
          doc.rect(x, y, colWidth, headerRowHeight).fillAndStroke('#fee2e2', '#000');
          doc
            .fillColor('#000')
            .fontSize(6.5)
            .text(f.nome, x + 2, y + 3, {
              width: colWidth - 4,
              align: 'center',
              ellipsis: true,
            });
          const sub = ehCoringa(f)
            ? 'coringa'
            : f.turnoPadrao
              ? `${formatTime(f.turnoPadrao.horaInicio)}–${formatTime(f.turnoPadrao.horaFim)}`
              : 'sem turno';
          doc
            .fontSize(6)
            .fillColor('#7f1d1d')
            .text(sub, x + 2, y + 11, {
              width: colWidth - 4,
              align: 'center',
              ellipsis: true,
            });
          doc
            .fontSize(6)
            .fillColor('#000')
            .text(
              `${formatarHoras(horasPorFuncionario.get(f.id) ?? 0)} no período`,
              x + 2,
              y + 19,
              { width: colWidth - 4, align: 'center', ellipsis: true },
            );
        });

        y += headerRowHeight;
      }

      desenharCabecalhoColunas();

      const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      const mesesAbrev = [
        'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
        'jul', 'ago', 'set', 'out', 'nov', 'dez',
      ];
      // Só repete "mês/ano" na primeira linha de cada mês (aqui, ou
      // depois de uma quebra de página) — nas demais linhas mostra só
      // o número do dia, pra ter bem menos informação repetida na
      // tela/PDF. Uma escala típica é 1 mês só, então normalmente isso
      // aparece uma vez, na primeira linha, e o resto da coluna fica
      // só com "01 (qui)", "02 (sex)"...
      let mesAnoAnterior: string | null = null;

      for (const dia of dias) {
        // Quebra de página: fica só como rede de segurança pra período
        // fora do normal (o cálculo acima já devia caber tudo numa
        // página só) — reserva a altura da linha + rodapé mínimo, e
        // reimprime o cabeçalho das colunas na página nova.
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          desenharCabecalhoColunas();
        }

        const diaIso = formatDate(dia);
        const domingo = dia.getUTCDay() === 0;
        const diaNumero = String(dia.getUTCDate()).padStart(2, '0');
        const mesAno = `${mesesAbrev[dia.getUTCMonth()]}/${dia.getUTCFullYear()}`;
        const labelDia =
          mesAno !== mesAnoAnterior
            ? `${diaNumero} ${mesAno} (${diasSemana[dia.getUTCDay()]})`
            : `${diaNumero} (${diasSemana[dia.getUTCDay()]})`;
        mesAnoAnterior = mesAno;

        doc
          .rect(margin, y, diaColWidth, rowHeight)
          .fillAndStroke(domingo ? '#fef2f2' : '#ffffff', '#000');
        doc
          .fillColor('#000')
          .fontSize(Math.min(6.5, cellFontSize + 0.5))
          .text(
            labelDia,
            margin + 3,
            y + offsetY,
            { width: diaColWidth - 6 },
          );

        funcionarios.forEach((f, i) => {
          const x = margin + diaColWidth + i * colWidth;
          const alocacao = alocacaoPorCelula.get(`${f.id}|${diaIso}`);

          if (!alocacao) {
            // Feriado master (Ano Novo, Páscoa, Dia do Trabalhador,
            // Natal): folga geral por padrão do sistema, não "sem
            // cobertura" — a geração nem tenta cobrir esses dias (ver
            // GeracaoEscalaService), então não faz sentido marcar como
            // se algo tivesse falhado.
            const feriado = ehFeriadoMaster(dia);
            const semCobertura =
              !feriado &&
              !ehCoringa(f) &&
              !!f.turnoPadrao &&
              !turnoCobertoNoDia.has(`${f.turnoPadrao.id}|${diaIso}`);
            const cor = feriado ? '#78716c' : semCobertura ? '#7f1d1d' : '#dc2626';
            const label = feriado ? 'FERIADO' : semCobertura ? 'FOLGA*' : 'FOLGA';
            doc.rect(x, y, colWidth, rowHeight).fillAndStroke(cor, '#000');
            doc
              .fillColor('#ffffff')
              .fontSize(cellFontSize)
              .text(label, x, y + offsetY, {
                width: colWidth,
                align: 'center',
              });
            return;
          }

          const ehPadrao = !ehCoringa(f) && alocacao.turnoId === f.turnoPadrao?.id;
          if (ehPadrao) {
            doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#ffffff', '#000');
            doc
              .fillColor('#a1a1aa')
              .fontSize(cellFontSize)
              .text('•', x, y + offsetY, { width: colWidth, align: 'center' });
            return;
          }

          doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#fee2e2', '#000');
          const label = `${formatTime(alocacao.turno.horaInicio)}–${formatTime(alocacao.turno.horaFim)}`;
          doc
            .fillColor('#7f1d1d')
            .fontSize(cellFontSize)
            .text(label, x, y + offsetY, { width: colWidth, align: 'center' });
        });

        y += rowHeight;
      }

      // ---- legenda + rodapé ----
      // Posição fixa (y += 8), não doc.moveDown — a altura reservada
      // em legendaAltura já garante espaço, então não precisa checar
      // quebra de página de novo aqui. 4 linhas agora (a explicação do
      // FERIADO foi pra linha própria, não coube junto com o resto sem
      // quebrar e sobrepor o rodapé).
      y += 8;
      if (y + 38 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc
        .fillColor('#000')
        .fontSize(6.5)
        .text(
          '• = turno padrão do titular   |   horário destacado = turno alterado, substituição ou coringa   |   FOLGA = dia de descanso',
          margin,
          y,
        );
      doc.text(
        'FOLGA* = vaga que ficou sem cobertura (ninguém disponível passou nas regras trabalhistas nesse dia)',
        margin,
        y + 9,
      );
      doc.text(
        'FERIADO = feriado nacional (Ano Novo, Páscoa, Dia do Trabalhador ou Natal) sem expediente por padrão do sistema — editável manualmente',
        margin,
        y + 18,
      );
      doc.text(
        `Gerado em ${formatDate(new Date())} pelo sistema OEF.`,
        margin,
        y + 27,
      );

      doc.end();
    });
  }
}
