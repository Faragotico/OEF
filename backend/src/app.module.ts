import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FuncionarioModule } from './modules/funcionario.module';
import { AlocacaoModule } from './modules/alocacao.module';
import { EmpresaModule } from './modules/empresa.module';
import { PostoTrabalhoModule } from './modules/posto-trabalho.module';
import { RegraModule } from './modules/regra.module';
import { TurnoModule } from './modules/turno.module';
import { EscalaModule } from './modules/escala.module';
import { AusenciaModule } from './modules/ausencia.module';
import { AuthModule } from './modules/auth.module';
import { JwtAuthGuard } from './infra/http/guards/jwt-auth.guard';

// O módulo raiz. Importa os modules de cada funcionalidade — assim o
// Nest passa a conhecer as rotas de cada um.
//
// O APP_GUARD abaixo é o que fecha o sistema: registrado aqui, o
// JwtAuthGuard roda antes de TODA rota da aplicação. Uma rota só fica
// aberta se for marcada com @Public() — hoje, o login, o logout e o
// healthcheck. Proteger por padrão e abrir caso a caso é o contrário
// de pôr o guard controller a controller, onde esquecer um passa
// despercebido.
@Module({
  imports: [
    AuthModule,
    FuncionarioModule,
    AlocacaoModule,
    EmpresaModule,
    PostoTrabalhoModule,
    RegraModule,
    TurnoModule,
    EscalaModule,
    AusenciaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
