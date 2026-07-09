# OEF — Organizador de Escalas de Funcionários

Sistema para geração e validação automática de escalas de trabalho,
respeitando as regras trabalhistas (escala 5x1, interjornada de 11h,
intrajornada, carga máxima de 44h semanais e descanso semanal).

Projeto acadêmico (8º semestre) desenvolvido para a empresa Sharon Pontes,
que fornece porteiros e recepcionistas terceirizados para os mercados Tozetto.

## O problema

Hoje as escalas são montadas manualmente em planilha. Isso é demorado e
propenso a erros — é fácil violar uma regra trabalhista sem perceber, e
reorganizar tudo quando um funcionário falta é trabalhoso. O OEF automatiza
a geração, valida as regras e alerta quando um posto fica sem cobertura.

## Stack

| Camada    | Tecnologia            |
| --------- | --------------------- |
| Frontend  | Next.js (React)       |
| Backend   | NestJS + Prisma       |
| Banco     | PostgreSQL            |
| Linguagem | TypeScript            |

## Como rodar (backend)

Pré-requisitos: Node.js (v20+), pnpm e PostgreSQL instalados, com um banco
chamado `oef` criado.

```bash
cd backend
pnpm install

# criar o arquivo .env a partir do exemplo e preencher a senha do banco
# (veja a seção "Variáveis de ambiente" abaixo)

pnpm exec prisma migrate dev   # cria as tabelas no banco
pnpm exec prisma db seed       # popula com dados de exemplo
pnpm run start:dev             # inicia o servidor em modo desenvolvimento
```

Para inspecionar o banco visualmente:

```bash
pnpm exec prisma studio        # abre em http://localhost:5555
```

## Variáveis de ambiente

O backend precisa de um arquivo `backend/.env` (não versionado). Conteúdo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/oef?schema=public"
```

Troque `SUA_SENHA` pela senha do usuário `postgres` definida na instalação.

## Estrutura do projeto

```
OEF/
├── backend/            → API NestJS + Prisma
│   ├── prisma/
│   │   ├── schema.prisma   ← definição das tabelas do banco
│   │   └── seed.ts         ← dados de exemplo
│   └── src/                ← código do servidor
└── frontend/           → aplicação Next.js (a ser criada)
```

## Principais entidades do banco

- **Funcionario** — porteiros e recepcionistas
- **PostoTrabalho** — locais que precisam de cobertura
- **Turno** — faixas de horário (manhã, tarde, noite)
- **Escala** — período de trabalho de um posto, regido por uma regra
- **Alocacao** — liga um funcionário a um turno em uma data (o coração do sistema)
- **Regra** — regras trabalhistas a serem validadas
- **Ausencia** — faltas e afastamentos, que disparam substituições

## Status

Em desenvolvimento. Etapa atual: setup do backend e modelagem do banco.
