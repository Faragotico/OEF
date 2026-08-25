import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Alocacao, Funcionario, Turno } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  diasDoPeriodo,
  formatDate,
  formatTime,
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
@Injectable()
export class EscalaPdfService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.montarPdf(escala, alocacoes);
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
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- cabeçalho ----
      doc
        .fontSize(16)
        .fillColor('#dc2626')
        .text('OEF — Escala de Trabalho', { align: 'left' });
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor('#000');
      doc.text(`Escala #${escala.id}`);
      doc.text(`Posto: ${escala.posto.nome} — ${escala.posto.localizacao}`);
      doc.text(`Empresa: ${escala.posto.empresa.nome}`);
      doc.text(
        `Período: ${formatDate(escala.dataInic)} a ${formatDate(escala.dataFim)}`,
      );
      doc.text(`Regra de escala: ${escala.regra.descricao} (${escala.regra.valor})`);
      doc.moveDown(0.6);

      const dias = diasDoPeriodo(escala.dataInic, escala.dataFim);

      // Funcionários com pelo menos uma alocação nesta escala, na mesma
      // ordem da tela: titulares por horário de início, coringas por
      // último.
      const funcionariosMap = new Map<number, Funcionario & { turnoPadrao: Turno | null }>();
      for (const a of alocacoes) funcionariosMap.set(a.funcionarioId, a.funcionario);
      const funcionarios = Array.from(funcionariosMap.values()).sort((a, b) => {
        if (a.coringa !== b.coringa) return a.coringa ? 1 : -1;
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

      // ---- grade dia x funcionário ----
      const margin = 30;
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const diaColWidth = 78;
      const colWidth = (pageWidth - margin * 2 - diaColWidth) / funcionarios.length;
      const headerRowHeight = 28;
      const rowHeight = 15;
      const cellFontSize = Math.max(5.5, Math.min(7, colWidth / 11));

      let y = doc.y;

      function desenharCabecalhoColunas() {
        doc
          .rect(margin, y, diaColWidth, headerRowHeight)
          .fillAndStroke('#fee2e2', '#000');
        doc
          .fillColor('#000')
          .fontSize(7)
          .text('Dia', margin + 3, y + 10, { width: diaColWidth - 6 });

        funcionarios.forEach((f, i) => {
          const x = margin + diaColWidth + i * colWidth;
          doc.rect(x, y, colWidth, headerRowHeight).fillAndStroke('#fee2e2', '#000');
          doc
            .fillColor('#000')
            .fontSize(6.5)
            .text(f.nome, x + 2, y + 4, {
              width: colWidth - 4,
              align: 'center',
              ellipsis: true,
            });
          const sub = f.coringa
            ? 'coringa'
            : f.turnoPadrao
              ? `${formatTime(f.turnoPadrao.horaInicio)}–${formatTime(f.turnoPadrao.horaFim)}`
              : 'sem turno';
          doc
            .fontSize(6)
            .fillColor('#7f1d1d')
            .text(sub, x + 2, y + 16, {
              width: colWidth - 4,
              align: 'center',
              ellipsis: true,
            });
        });

        y += headerRowHeight;
      }

      desenharCabecalhoColunas();

      for (const dia of dias) {
        // Quebra de página: reserva a altura da linha + rodapé mínimo,
        // e reimprime o cabeçalho das colunas na página nova — senão a
        // tabela continua "sem legenda" depois de uma quebra.
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          desenharCabecalhoColunas();
        }

        const diaIso = formatDate(dia);
        const domingo = dia.getUTCDay() === 0;
        const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

        doc
          .rect(margin, y, diaColWidth, rowHeight)
          .fillAndStroke(domingo ? '#fef2f2' : '#ffffff', '#000');
        doc
          .fillColor('#000')
          .fontSize(6.5)
          .text(`${diaIso} (${diasSemana[dia.getUTCDay()]})`, margin + 3, y + 4, {
            width: diaColWidth - 6,
          });

        funcionarios.forEach((f, i) => {
          const x = margin + diaColWidth + i * colWidth;
          const alocacao = alocacaoPorCelula.get(`${f.id}|${diaIso}`);

          if (!alocacao) {
            doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#dc2626', '#000');
            doc
              .fillColor('#ffffff')
              .fontSize(cellFontSize)
              .text('FOLGA', x, y + 4, { width: colWidth, align: 'center' });
            return;
          }

          const ehPadrao = !f.coringa && alocacao.turnoId === f.turnoPadrao?.id;
          if (ehPadrao) {
            doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#ffffff', '#000');
            doc
              .fillColor('#a1a1aa')
              .fontSize(cellFontSize)
              .text('•', x, y + 4, { width: colWidth, align: 'center' });
            return;
          }

          doc.rect(x, y, colWidth, rowHeight).fillAndStroke('#fee2e2', '#000');
          const label = `${formatTime(alocacao.turno.horaInicio)}–${formatTime(alocacao.turno.horaFim)}`;
          doc
            .fillColor('#7f1d1d')
            .fontSize(cellFontSize)
            .text(label, x, y + 4, { width: colWidth, align: 'center' });
        });

        y += rowHeight;
      }

      // ---- legenda + rodapé ----
      doc.moveDown(1);
      if (y + 40 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      } else {
        y += 10;
      }
      doc
        .fillColor('#000')
        .fontSize(7)
        .text(
          '• = turno padrão do titular   |   horário destacado = turno alterado, substituição ou coringa   |   FOLGA = dia de descanso',
          margin,
          y,
        );
      doc.text(
        `Gerado em ${formatDate(new Date())} pelo sistema OEF.`,
        margin,
        y + 12,
      );

      doc.end();
    });
  }
}
