import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ValidationPipe global: liga a validação dos DTOs em TODAS as rotas.
  //   whitelist: remove campos que não estão no DTO (segurança)
  //   forbidNonWhitelisted: recusa se o cliente mandar campo a mais
  //   transform: converte tipos automaticamente (ex: "44" -> 44)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: permite que o frontend (porta 3000) chame este backend (3001).
  // Sem isso, o navegador bloqueia a chamada por segurança.
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' });

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Backend rodando em http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
