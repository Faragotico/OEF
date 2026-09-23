import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Node 20.6+ carrega o .env sozinho; o Prisma 6 não faz mais isso.
  try {
    process.loadEnvFile();
  } catch {
    // sem .env: segue com variáveis já no ambiente (produção)
  }

  // Falha na subida é melhor que falhar no primeiro login.
  const segredo = process.env.JWT_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error(
      'JWT_SECRET ausente ou curta demais (mínimo 32 caracteres).\n' +
        'Gere uma com:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
        'e coloque no arquivo .env do backend. Ver .env.example.',
    );
  }

  const app = await NestFactory.create(AppModule);

  // Postgres rejeita 0x00 em texto e o erro subia como 500; aqui vira
  // 400. Trata o corpo inteiro (não campo a campo) porque nenhum
  // campo de texto do sistema pode ter caractere nulo.
  app.use((req: { body?: unknown }, res: any, next: () => void) => {
    const temNulo = (valor: unknown): boolean => {
      if (typeof valor === 'string') return valor.includes('\u0000');
      if (Array.isArray(valor)) return valor.some(temNulo);
      if (valor && typeof valor === 'object') {
        return Object.values(valor).some(temNulo);
      }
      return false;
    };
    if (temNulo(req.body)) {
      res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'O corpo da requisição contém caractere nulo (0x00), que não pode ser armazenado.',
      });
      return;
    }
    next();
  });

  // ValidationPipe global: whitelist remove campo fora do DTO,
  // forbidNonWhitelisted recusa campo a mais, transform converte tipo.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // credentials: true autoriza o cookie de sessão nas chamadas dos
  // Client Components — e por isso a origem não pode ser "*".
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(
    `🚀 Backend rodando em http://localhost:${process.env.PORT ?? 3001}`,
  );
}
bootstrap();
