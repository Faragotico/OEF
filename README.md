# OEF — Organizador de Escalas de Funcionários

Sistema web para geração e validação automática de escalas de trabalho,
respeitando as regras trabalhistas (rodízio configurável, interjornada,
intrajornada, carga horária semanal e descanso semanal remunerado).

Desenvolvido para a Sharon Pontes — empresa
que fornece porteiros e recepcionistas terceirizados para os mercados Tozetto.

## O problema

As escalas eram montadas manualmente em planilha: demorado, e fácil violar
uma regra trabalhista sem perceber. Reorganizar tudo quando um funcionário
falta era trabalhoso, e não havia como saber se um posto ficaria sem
cobertura antes do dia chegar.

## O que o sistema faz

- **Gera a escala automaticamente** a partir do cadastro (posto, turnos,
  demanda por dia da semana, equipe) e de um rodízio (ex.: 5x1)
- **Simula antes de gravar** — mostra o resultado sem alterar o banco
- **Aponta cada vaga que não foi coberta**, com a regra trabalhista que
  impediu cada candidato (não é só "vazio": diz o motivo)
- **Edição manual** por célula, sobre o que o motor gerou
- **Valida** uma escala já editada contra as regras, a qualquer momento
- **Exporta em PDF** (preto e branco — pensado para impressão/fotocópia)
- **Login com sessão**, com o sistema fechado por padrão

### As regras trabalhistas (RN01–RN07)

| Código | Regra |
| --- | --- |
| RN01 | Funcionário inativo não é escalado |
| RN02 | Ausência registrada (férias, atestado) bloqueia o dia |
| RN04 | Carga horária semanal (padrão 44h) |
| RN05 | Interjornada mínima entre dois turnos (padrão 11h) |
| RN06 | Máximo de dias consecutivos trabalhados (o rodízio, ex.: 5 no 5x1) |
| RN07 | Descanso semanal remunerado (no máximo 6 dias seguidos, sempre) |

O motor também respeita qualificação (em que turnos cada pessoa pode
entrar) e dia da semana vetado (ex.: um titular que nunca trabalha domingo).

## Stack

| Camada    | Tecnologia |
| --------- | --- |
| Frontend  | Next.js 16 (App Router, Turbopack) + React 19 |
| Backend   | NestJS 11 + Prisma 6 |
| Banco     | PostgreSQL |
| Linguagem | TypeScript |
| Pacotes   | pnpm |

## Como rodar

Pré-requisitos: Node.js 20+, pnpm e PostgreSQL, com um banco `oef` criado.

### 1. Backend

```bash
cd backend
pnpm install

cp .env.example .env
# edite o .env: preencha DATABASE_URL (senha do seu Postgres) e gere um
# JWT_SECRET com:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

pnpm exec prisma migrate dev    # cria as tabelas
pnpm exec prisma db seed        # dados de exemplo (empresas, postos, turnos)
pnpm exec ts-node prisma/seed-usuario.ts   # cria o usuário de login (lê ADMIN_* do .env)

pnpm run start:dev              # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev                        # http://localhost:3000
```

Acesse `http://localhost:3000` e entre com o e-mail e senha definidos em
`ADMIN_EMAIL` / `ADMIN_SENHA` no `.env` do backend.

### Testes

```bash
cd backend
pnpm test        # suíte do motor de escala e da camada de sessão
```

## Variáveis de ambiente (backend/.env)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | conexão com o Postgres |
| `JWT_SECRET` | sim | assina o token de sessão — mínimo 32 caracteres, sem padrão (o backend recusa subir sem ela) |
| `ADMIN_EMAIL`, `ADMIN_NOME`, `ADMIN_SENHA` | só para rodar o seed de usuário | lidos por `seed-usuario.ts`; rodar de novo com o mesmo e-mail troca a senha |
| `PORT` | não (padrão 3001) | porta do backend |
| `FRONTEND_URL` | só em produção | origem liberada no CORS — obrigatória e exata quando o cookie de sessão está em jogo |
| `JWT_EXPIRES_IN_SECONDS` | não (padrão 28800 = 8h) | duração da sessão |

Veja `backend/.env.example` para o arquivo completo comentado.

## Estrutura do projeto

```
OEF/
├── backend/                    API NestJS + Prisma
│   ├── prisma/
│   │   ├── schema.prisma       tabelas do banco
│   │   ├── migrations/
│   │   ├── seed.ts             dados de exemplo
│   │   └── seed-usuario.ts     cria/atualiza o usuário de login
│   └── src/
│       ├── domain/             regras de negócio e o motor de escala
│       │   └── escala/         planejador.ts (o motor), restricoes.ts (RN01–RN07)
│       ├── infra/http/         controllers, DTOs, guards, presenters
│       ├── helpers/            utilidades puras (data, senha/token)
│       └── modules/
└── frontend/                   Next.js
    └── src/
        ├── app/                páginas (App Router)
        ├── components/         componentes de UI
        └── lib/                cliente de API (versões client/server)
```

## Decisões técnicas que valem registrar

- **Motor de escala como domínio puro**: `planejar()` não conhece Prisma
  nem HTTP — recebe dados, devolve um plano. A unidade de decisão é a
  *vaga* (dia + turno + índice), não a pessoa; folga é o resíduo de quem
  não recebeu vaga nenhuma no dia.
- **Desempenho**: o preenchimento das vagas usa memoização com invalidação
  por janela de ±7 dias (o alcance de todas as regras duras), o que tirou
  o comportamento quadrático do caso de escala anual sem mudar o
  resultado — verificado byte a byte contra a versão anterior.
- **Autenticação sem dependência nova**: JWT HS256 montado só com
  `node:crypto` (scrypt para senha, HMAC-SHA256 para assinar o token),
  cookie httpOnly.
- **Uma instância por empresa contratante** (não multi-inquilino): o
  escopo desta entrega é uma empresa de portaria com um gestor; várias
  empresas compartilhando a mesma base fica como evolução futura.

## Status

Funcional: geração automática, edição manual, validação, PDF e login.
Limitações conhecidas e trabalhos futuros estão documentados junto ao
material da disciplina.
