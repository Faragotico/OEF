import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Esta classe É um PrismaClient (extends), mas embrulhado como um
// "provider" do NestJS (@Injectable). Assim qualquer outra classe pode
// pedir o Prisma no construtor e o Nest entrega esta instância única.
// OnModuleInit: quando o servidor sobe, abrimos a conexão com o banco.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
