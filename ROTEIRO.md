# OEF — Roteiro de setup (Passo 1: o alicerce)

Objetivo desta etapa: sair com o backend NestJS criado, o banco PostgreSQL
com todas as tabelas, e dados de exemplo dentro. Só copiar e colar, na ordem.

## 0. Pré-requisitos

- Node.js LTS (v20+) → verifique com `node -v`
- PostgreSQL rodando localmente → verifique com `psql --version`
  (se você usa Docker na Virtwell, alternativa:
  `docker run --name oef-db -e POSTGRES_PASSWORD=oef123 -e POSTGRES_DB=oef -p 5432:5432 -d postgres:16`)

## 1. Criar o banco (pule se usou Docker acima)

```bash
psql -U postgres -c "CREATE DATABASE oef;"
```

## 2. Criar o projeto NestJS

```bash
npx @nestjs/cli new backend
# escolha npm quando perguntar o gerenciador de pacotes
cd backend
```

## 3. Instalar e configurar o Prisma

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

## 4. Substituir os arquivos gerados

- Substitua o conteúdo de `backend/prisma/schema.prisma` pelo arquivo
  `schema.prisma` deste kit.
- Copie o `seed.ts` deste kit para `backend/prisma/seed.ts`.
- No arquivo `backend/.env`, ajuste a conexão (troque usuário/senha pelos seus):

```
DATABASE_URL="postgresql://postgres:oef123@localhost:5432/oef?schema=public"
```

## 5. Registrar o seed no package.json

Adicione este bloco no `backend/package.json` (no nível raiz do JSON,
por exemplo logo após "license"):

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

## 6. Criar as tabelas e popular

```bash
npx prisma migrate dev --name inicial
npx prisma db seed
```

O `migrate dev` lê o schema.prisma, gera o SQL (equivalente à seção 4.6
do documento) e aplica no banco. O `db seed` insere os dados de exemplo.

## 7. Conferir o resultado

```bash
npx prisma studio
```

Abre uma interface no navegador (http://localhost:5555) mostrando todas
as tabelas. Confira: 5 funcionários, 5 regras, 3 turnos, 3 postos,
3 escalas de julho.

## Deu erro?

- "Can't reach database server" → o PostgreSQL não está rodando ou a
  DATABASE_URL está errada (usuário/senha/porta).
- "ts-node: not found" → rode `npm install ts-node --save-dev`.
- Qualquer outro → me manda a mensagem de erro completa no chat.

## O que vem depois (não precisa fazer nada ainda)

1. Módulos CRUD no NestJS (funcionários, postos, turnos, regras)
2. Frontend Next.js com as primeiras telas
3. Escala manual (a grade do mês)
4. Validador de regras trabalhistas
5. Ausências + alertas de cobertura
6. Gerador automático de escala
7. Exportação em PDF
