# Plano do app desktop (.exe) — OEF

## Objetivo
Entregar o OEF como instalador Windows (`Setup.exe`) de clicar e abrir: janela própria
(Electron), tudo local na máquina do gestor, sem Node nem Postgres instalados, sem internet.
Vários gestores na mesma máquina e no mesmo banco, cada um com login próprio e mexendo só nas
próprias escalas. Depois de entregue, mudanças = novo build + instalar por cima (dados ficam
em `%APPDATA%/OEF` e não se perdem).

## Passo 5 feito — instalador gerado (falta testar em PC/VM limpo)
- `pnpm instalador` = `pnpm build` + `pnpm pacote` + `electron-builder --win nsis`. Saída:
  `desktop/dist-instalador/OEF-Setup-1.0.0.exe` (~145 MB). `win-unpacked/OEF.exe` testa sem instalar.
- `scripts/preparar-pacote.js` monta `desktop/pacote` (vai INTEIRA para resources/):
  frontend = standalone sem node_modules + `npm install` (next/react); backend = dist/src, schema,
  migrações + `npm install --omit=dev` com versões exatas + CLI do prisma + `prisma generate`;
  postgres = binários (sem wx*.dll); icone.png. Sem `.env` nenhum.
- Lições: o pnpm faz node_modules de links (no PC do gestor apontariam para o nada) → reinstalar
  com npm; o electron-builder descarta o node_modules da RAIZ de cada extraResources → copiar
  `pacote` inteiro; filtro `**/*` ignora `.next` → sem filtro.
- Primeira abertura depois de instalar/buildar pode levar 25-30 s na API (antivírus examinando
  arquivos novos): espera de até 2 min e aviso na janelinha.
- Sem assinatura de código: o Windows mostra SmartScreen ("Executar assim mesmo").
- Melhorias futuras: empacotar o backend num arquivo só (menos arquivos = abre mais rápido),
  asar, ícone .ico próprio.

## Passo 4 (parte do instalador) feito — falta o teste do usuário na tela
- Primeiro acesso: `GET /auth/situacao` (público, só sim/não) e `POST /auth/primeiro-acesso`
  (público, cria o 1º gestor e já entra; recusa com 409 se já houver qualquer usuário — conferência
  e criação na mesma transação serializável). Tela `/primeiro-acesso`; o login manda para ela
  quando o banco está vazio. Campo de senha com "Mostrar" virou componente (`campo-senha.tsx`).
- Desktop apaga os cookies a cada abertura (o próximo gestor não entra logado como o anterior).
- FICOU PARA DEPOIS (não impede o instalador): cadastro de mais gestores pela tela e cada gestor
  ver só as próprias escalas (`usuarioId` em Escala).

## Passo 3 feito (falta o teste do usuário abrindo o app)
- `banco.js`: Postgres 18 embutido (pacote `@embedded-postgres/windows-x64`, só os binários),
  controlado por `pg_ctl` (não pela lib `embedded-postgres`, que desliga com taskkill /f).
  Dados em `%APPDATA%OEFpostgresdata`, senha aleatória em `postgressenha.txt`, porta 54329
  só em 127.0.0.1, ordenação ICU pt-BR. initdb na 1ª vez; servidor que sobrou de queda é
  desligado e religado; desliga com `-m fast` ao fechar.
- `main.js`: `app.setName("OEF")` (+ `productName`) fixa a pasta de dados. Ordem: banco →
  `prisma migrate deploy` (toda abertura) → API e interface → janela. Janelinha "Abrindo…".
  Logs em `%APPDATA%OEFlogs` (postgres, migracao, api, interface); erro mostra as últimas linhas.
- `filho.js`: canal IPC com cada filho; se o app cair, a API e a interface morrem junto.
- Banco embutido começa VAZIO: com o app aberto, `pnpm banco:usuario` e `pnpm banco:cenarios`.
- Testado por roteiro (não pela janela): criação do zero (~7 s), migrações, API via filho.js,
  queda do pai (API morre junto, banco reabre normal).

## Passo 2 feito e testado (front + back sobem juntos no desktop)
- `main.js` sobe também `backend/dist/src/main.js` (dist/src porque o tsconfig compila
  prisma/ e scripts/) como filho, com `NODE_ENV=production`, `PORT=3001`, `HOST=127.0.0.1`,
  `FRONTEND_URL`, `COOKIE_SEGURO=false`, `JWT_SECRET` (gerado e salvo em
  `userData/jwt-secret.txt`) e `DATABASE_URL` (TEMPORÁRIO: lido do `backend/.env` até o passo 3).
- Backend: `COOKIE_SEGURO` (padrão segue `NODE_ENV`) e `HOST` opcionais.
- Prisma rodando com `ELECTRON_RUN_AS_NODE` confirmado. `binaryTargets`/`asarUnpack` ficam
  para o passo 5.
- Rodar: `cd desktop` → `pnpm build` → `pnpm start` (sem `start:dev` aberto).

## Passo 1 — feito e testado
- `desktop/main.js` (Electron): sobe `frontend/.next/standalone/server.js` como processo filho
  (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`) na porta 3000 e abre a janela em
  `http://localhost:3000`. Já tem: instância única, bloqueio de navegação externa, download de
  PDF com diálogo de salvar (`will-download`), erros explicados em caixa de diálogo.
- Postgres ainda roda SOLTO.
- `frontend/next.config.ts`: `output: "standalone"`.
- Rodar: `cd desktop` → `pnpm front:build` → `pnpm start`.
- A flag `AUTH_DESATIVADA` (entrar sem senha) foi REMOVIDA em 06/11: login normal de novo.
  Usuário de teste: `pnpm exec ts-node prisma/seed-usuario.ts` no backend (lê ADMIN_* do .env).
- Testado: janela abre sem login, grade de escala, validação, ajuda contextual, dicas.
- Ainda NÃO confirmado: "PDF ↓" dentro do Electron; fechar e reabrir sem "porta em uso".

## Decisões já tomadas
- Electron + electron-builder, alvo NSIS (`Setup.exe`). Só Windows; build feito no Windows.
- Banco: tentar **Postgres embutido** (pacote `embedded-postgres`) primeiro; SQLite é plano B.
  Motivo: o schema usa `Int[]` (`diasSemanaVetados`), `@db.VarChar/Char` e há triggers de
  CPF/CNPJ (`prisma/migrations/20260922140000_validacao_cpf_cnpj`). No SQLite isso exigiria
  mexer no schema, recriar migrations e alterar a documentação já aprovada pela banca.
- Prisma fica no 6.x (não migrar para 7).
- Dados em `app.getPath("userData")` (`%APPDATA%/OEF`), nunca na pasta do app.
- A janela abre em `localhost` (mesmo nome de host da API): cookie é por host, não misturar
  `127.0.0.1` com `localhost`.
- Portas fixas (front 3000, back 3001): `NEXT_PUBLIC_API_URL` é gravada no build do front.

## Próximos passos (um por vez; testar entre eles)
2. **Backend como processo filho.** `nest build` → `dist/main`; rodar com
   `ELECTRON_RUN_AS_NODE`. Env: `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET` (gerado
   na primeira execução e guardado em userData; o backend recusa subir sem). Cookie de login:
   `auth.controller.ts` usa `secure: NODE_ENV === 'production'` e o app roda em http local →
   trocar por variável própria. Prisma tem binário nativo: pode precisar de `asarUnpack` e
   `binaryTargets = ["native", "windows"]`.
3. **Postgres embutido.** Inicializar o cluster em userData na primeira vez, subir ao abrir
   (porta livre ou fixa), `prisma migrate deploy` a cada abertura, parar em `before-quit`,
   tratar travas depois de queda do app.
4. **Primeira execução e gestores.** Criar o primeiro gestor dentro do app (hoje é o script
   `backend/prisma/seed-usuario.ts` com `ADMIN_EMAIL/ADMIN_SENHA`), cadastro de mais gestores,
   e ligar `Usuario` à `Escala` (hoje não há `usuarioId`) para cada gestor ver só as suas.
   Decidir antes se postos/funcionários também são por gestor. (Login já está ligado.)
5. **Instalador.** electron-builder (NSIS) levando: frontend standalone (+ `.next/static` e
   `public`), backend `dist` + dependências de produção, engines do Prisma, binários do
   Postgres. Ícone (`frontend/public/android-chrome-512x512.png` → .ico), versão exibida no
   menu ("Versão 1.0.0"). Testar em PC/VM Windows LIMPO (sem Node, sem Postgres). O Windows
   mostra SmartScreen por falta de assinatura de código: aceitável para a banca.

## Feito fora do plano (06/11, pedidos da banca)
- Login com "mostrar senha"; cargo virou tabela (`/cargos`, migração `20261106120000_cargo_tabela`);
  dropdowns pesquisáveis (`SelectPesquisavel`); PDF sem fundos preenchidos; fotos na ajuda
  (`pnpm ajuda:fotos` aqui na pasta desktop refaz as capturas em `frontend/public/ajuda`).

## Cuidados
- `caminhoDoServidorFront()` em `main.js` aponta para a pasta do repositório; ao empacotar
  passa a usar `process.resourcesPath`.
- pnpm 11 no Windows: `allowBuilds` em `pnpm-workspace.yaml` (já há um em cada pasta); o
  standalone com pnpm pode exigir o Modo de Desenvolvedor do Windows (symlinks). Manter o
  repositório fora do OneDrive.
- `next build` baixa as fontes do Google (Geist) na hora do build: precisa de internet no
  build, não na execução.
- PDF usa `pdfkit` (JS puro); a rota responde com `Content-Disposition: attachment`.
- Backend tem testes (`pnpm test`); rodar depois de mexer no backend.

## Como trabalhar com o usuário
- Português; respostas curtas e objetivas, listas curtas, sem preâmbulo nem recapitulação;
  detalhar só se ele pedir.
- Um passo por vez. Ao fim de cada um: como testar + mensagem de commit sugerida (sem linhas
  de atribuição/Co-Authored-By).
- Não rodar comandos git: ele mesmo commita.
- Comentários de código em português, explicando o porquê.
- Em stand-by até ele liberar: melhorias do PDF, documentação (item 6 da banca), dropdowns
  pesquisáveis, demais itens do 4º bimestre (vídeo, indicadores, dados reais).
