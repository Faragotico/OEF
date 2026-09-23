import { Module } from '@nestjs/common';
import { EscalaController } from '../infra/http/controllers/escala.controller';
import { EscalaService } from '../domain/services/escala.service';
import { EscalaRepository } from '../domain/repositories/escala.repository';
import { GeracaoEscalaService } from '../domain/services/geracao-escala.service';
import { RegrasTrabalhistasService } from '../domain/services/regras-trabalhistas.service';
import { EscalaPdfService } from '../domain/services/escala-pdf.service';
import { PostoTrabalhoRepository } from '../domain/repositories/posto-trabalho.repository';
import { RegraRepository } from '../domain/repositories/regra.repository';
import { PrismaService } from '../infra/database/prisma.service';

// O Module é a "lista de peças" desta funcionalidade. Repare que ele
// reaproveita repositories de OUTROS módulos (PostoTrabalho, Regra) —
// a geração automática precisa ler essas tabelas. Cada módulo do Nest é isolado por padrão, então esses
// providers são redeclarados aqui (mesmo padrão já usado nos outros
// módulos deste projeto). TurnoRepository saiu daqui: desde que cada
// funcionário carrega o próprio turnoPadraoId, o GeracaoEscalaService
// não precisa mais consultar a tabela de turnos diretamente.
// AlocacaoRepository também saiu: a geração agora grava as alocações
// pelo cliente da transação ($transaction), não pelo repository.
@Module({
  controllers: [EscalaController],
  providers: [
    EscalaService,
    EscalaRepository,
    GeracaoEscalaService,
    RegrasTrabalhistasService,
    EscalaPdfService,
    PostoTrabalhoRepository,
    RegraRepository,
    PrismaService,
  ],
})
export class EscalaModule {}
