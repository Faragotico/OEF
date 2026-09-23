# OEF — Backend

API do OEF (Organizador de Escalas de Funcionários), construída com
[NestJS](https://nestjs.com), [Prisma](https://prisma.io) e PostgreSQL.
Veja o [README raiz](../README.md) para o que o sistema faz e como rodar
o projeto completo (backend + frontend).

## Setup rápido

```bash
pnpm install
cp .env.example .env      # preencha DATABASE_URL e gere um JWT_SECRET
pnpm exec prisma migrate dev
pnpm exec prisma db seed
pnpm exec ts-node prisma/seed-usuario.ts
pnpm run start:dev
```

Pré-requisitos: Node.js 20+, pnpm, PostgreSQL. Ver `.env.example` para a
lista completa de variáveis.

### Windows: "execução de scripts foi desabilitada"

Se o PowerShell recusar rodar `npm`/`pnpm` com um erro
`UnauthorizedAccess` / `PSSecurityException`, rode uma vez (sem precisar
de administrador):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Scripts

```bash
pnpm run start:dev     # desenvolvimento, recarrega a cada alteração
pnpm run start:prod    # produção (precisa de pnpm run build antes)
pnpm run test          # suíte do motor de escala e da camada de sessão
pnpm run test:cov      # com cobertura
pnpm exec prisma studio  # inspecionar o banco em http://localhost:5555
```

## Estrutura

```
src/
├── domain/
│   ├── escala/        motor de escala (planejador.ts) e as regras RN01–RN07
│   ├── services/       regras de negócio de cada entidade
│   └── repositories/    acesso ao Prisma
├── infra/http/
│   ├── controllers/    rotas HTTP
│   ├── dtos/            validação de entrada
│   ├── guards/          autenticação (JwtAuthGuard, global)
│   └── presenters/      formato de saída
├── helpers/             utilidades puras (data, senha/token)
└── modules/              wiring do Nest
```

## Recursos úteis

- [Documentação do NestJS](https://docs.nestjs.com)
- [Documentação do Prisma](https://www.prisma.io/docs)
