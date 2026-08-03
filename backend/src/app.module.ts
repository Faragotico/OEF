import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FuncionarioModule } from './modules/funcionario.module';
import { AlocacaoModule } from './modules/alocacao.module';
import { EmpresaModule } from './modules/empresa.module';
import { PostoTrabalhoModule } from './modules/posto-trabalho.module';

// O módulo raiz. A única mudança em relação ao que o Nest gerou é
// importar os modules na lista de imports — assim o Nest
// passa a conhecer as rotas /.
@Module({
  imports: [
    FuncionarioModule,
    AlocacaoModule,
    EmpresaModule,
    PostoTrabalhoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
