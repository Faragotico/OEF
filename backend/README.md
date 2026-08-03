# OEF — Backend

<!-- TODO: substituir pela descrição real do projeto.
     Sugestão de estrutura: o que o OEF é, que problema resolve,
     e para quem foi feito. 2 a 4 linhas bastam. -->

Backend do projeto OEF, construído com [NestJS](https://nestjs.com) e TypeScript.

---

## Setup do ambiente

### Pré-requisitos

- **Node.js** v20 ou superior ([download](https://nodejs.org))
- **pnpm** (ver abaixo)
<!-- TODO: adicionar aqui banco de dados / outros serviços, se o projeto usar.
     Ex.: PostgreSQL 15+, Redis, Docker... -->

### Instalando o pnpm

Opção recomendada — via Corepack (garante a mesma versão para todo o time):

```bash
corepack enable pnpm
```

Opção alternativa — instalação global:

```bash
npm install -g pnpm
```

Confirme a instalação com:

```bash
pnpm -v
```

### Windows: erro "execução de scripts foi desabilitada"

Por padrão o PowerShell bloqueia scripts `.ps1`, o que impede o `npm` e o `pnpm`
de rodarem. Se aparecer um erro `UnauthorizedAccess` / `PSSecurityException`,
rode uma única vez (não precisa de permissão de administrador):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

`RemoteSigned` permite scripts locais e exige assinatura apenas em scripts
baixados da internet — mais seguro que `Unrestricted`.

### Instalando as dependências

```bash
pnpm install
```

### Variáveis de ambiente

<!-- TODO: revisar esta seção inteira conforme o que o OEF realmente usa.
     Se o projeto não tem .env, pode apagar. Se tem, listar as variáveis
     obrigatórias e criar um arquivo .env.example no repositório. -->

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

Variáveis necessárias:

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta em que a API sobe (ex.: `3000`) |
| | |

### Banco de dados

<!-- TODO: preencher com os comandos que VOCÊ precisou rodar para o banco
     funcionar na sua máquina. Se não há banco, apague esta seção. -->

---

## Rodando o projeto

```bash
# desenvolvimento
pnpm run start

# modo watch (recarrega a cada alteração)
pnpm run start:dev

# produção
pnpm run start:prod
```

## Testes

```bash
# testes unitários
pnpm run test

# testes end-to-end
pnpm run test:e2e

# cobertura de testes
pnpm run test:cov
```

---

## Estrutura do projeto

<!-- TODO opcional, mas muito útil: uma árvore curta das pastas principais
     com uma linha explicando cada uma. Ex.:

src/
├── modules/     # módulos de domínio da aplicação
├── common/      # guards, filters, pipes compartilhados
└── main.ts      # ponto de entrada
-->

## Recursos úteis

- [Documentação do NestJS](https://docs.nestjs.com)
- [Documentação do pnpm](https://pnpm.io)
- [NestJS Devtools](https://devtools.nestjs.com) — visualização do grafo da aplicação