import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FuncionarioModule } from './funcionario.module';

// O módulo raiz. A única mudança em relação ao que o Nest gerou é
// importar o FuncionarioModule na lista de imports — assim o Nest
// passa a conhecer as rotas /funcionarios.
@Module({
  imports: [FuncionarioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
