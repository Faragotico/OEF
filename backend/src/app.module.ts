import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FuncionarioModule } from './funcionario.module';
import { AlocacaoModule } from './alocacao.module';

// O módulo raiz. A única mudança em relação ao que o Nest gerou é
// importar os modules na lista de imports — assim o Nest
// passa a conhecer as rotas /.
@Module({
  imports: [FuncionarioModule, AlocacaoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
