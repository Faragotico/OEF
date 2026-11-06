"use strict";

// Processo principal do OEF desktop (Electron).
//
// Ao abrir, sobe tudo o que o sistema precisa, nesta ordem:
//   1. o banco Postgres embutido (banco.js), com os dados em %APPDATA%\OEF;
//   2. as migrações do banco (prisma migrate deploy) — instalar uma versão
//      nova por cima atualiza o banco sozinho na próxima abertura;
//   3. a API (Nest) e a interface (Next standalone), como processos filhos;
//   4. a janela, apontando para a interface.
// Ao fechar, desliga tudo na ordem inversa.

const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { criarBanco } = require("./banco");

// Nome do app ANTES de qualquer app.getPath("userData"): é ele que define a
// pasta de dados (%APPDATA%\OEF). Sem isto, rodando pelo `electron .` a
// pasta seria "oef-desktop", e no instalador viraria "OEF" — os dados
// pareceriam ter sumido na troca.
app.setName("OEF");

const PORTA_FRONT = 3000;
// Fixa: o endereço da API é gravado no build do frontend (NEXT_PUBLIC_API_URL).
const PORTA_API = 3001;
// A janela abre em "localhost" (e não 127.0.0.1) de propósito: a API
// também é "localhost:3001", e cookie é por nome de host. Misturar os
// dois nomes faria o cookie de login não chegar ao backend.
const ORIGEM_FRONT = `http://localhost:${PORTA_FRONT}`;
const ORIGEM_API = `http://localhost:${PORTA_API}`;
// Os servidores escutam no IP direto (só a própria máquina alcança);
// estes são só para a checagem de "já subiu?".
const TESTE_FRONT = `http://127.0.0.1:${PORTA_FRONT}`;
const TESTE_API = `http://127.0.0.1:${PORTA_API}`;

const MODO_DEV = process.argv.includes("--dev");

const filhos = [];
let janela = null;
let aguarde = null;
let banco = null;
let encerrando = false;

// ---------- caminhos ----------

// Em desenvolvimento tudo vem das pastas do repositório; no instalador,
// de dentro da pasta resources do app (ver "extraResources" no package.json).
function caminhos() {
  if (app.isPackaged) {
    const r = process.resourcesPath;
    return {
      back: path.join(r, "backend", "dist", "src", "main.js"),
      front: path.join(r, "frontend", "server.js"),
      prismaCli: path.join(r, "backend", "node_modules", "prisma", "build", "index.js"),
      schema: path.join(r, "backend", "prisma", "schema.prisma"),
      icone: path.join(r, "icone.png"),
    };
  }
  const raiz = path.resolve(__dirname, "..");
  return {
    // dist/src (e não dist/) porque o tsconfig também compila prisma/ e scripts/.
    back: path.join(raiz, "backend", "dist", "src", "main.js"),
    front: path.join(raiz, "frontend", ".next", "standalone", "server.js"),
    prismaCli: path.join(raiz, "backend", "node_modules", "prisma", "build", "index.js"),
    schema: path.join(raiz, "backend", "prisma", "schema.prisma"),
    icone: path.join(raiz, "frontend", "public", "android-chrome-512x512.png"),
  };
}

const pastaLogs = () => path.join(app.getPath("userData"), "logs");

// ---------- utilidades ----------

// true se algo responder HTTP nesse endereço (qualquer status serve:
// um redirecionamento para /login também significa "está no ar").
function responde(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function esperarResponder(url, tentativas) {
  for (let i = 0; i < tentativas; i++) {
    if (await responde(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function ultimasLinhas(arquivo, quantidade = 12) {
  try {
    return fs.readFileSync(arquivo, "utf8").trimEnd().split(/\r?\n/).slice(-quantidade).join("\n");
  } catch {
    return "";
  }
}

// Erro que sabe qual arquivo de log explica o que aconteceu.
class ErroComLog extends Error {
  constructor(mensagem, arquivoLog) {
    super(mensagem);
    this.arquivoLog = arquivoLog;
  }
}

// Mostra o erro e fecha. Com o log junto: no PC do gestor não há console,
// e "código 1" sozinho não diz nada a ninguém.
function falhar(mensagem, arquivoLog) {
  if (encerrando) return;
  let texto = mensagem;
  if (arquivoLog) {
    const final = ultimasLinhas(arquivoLog);
    texto += `\n\nRegistro: ${arquivoLog}`;
    if (final) texto += `\n\nÚltimas linhas:\n${final}`;
  }
  if (aguarde) aguarde.destroy();
  dialog.showErrorBox("OEF Sistema", texto);
  app.quit();
}

// ---------- processos filhos ----------

// Sobe um script Node usando o próprio Electron: process.execPath é o
// executável do Electron e, com ELECTRON_RUN_AS_NODE, ele se comporta como
// o Node comum. Assim o app não depende de ter Node instalado na máquina.
//
// Passa por filho.js, que abre um canal IPC: se o app cair, o filho morre
// junto em vez de ficar segurando a porta.
function iniciarFilho(nome, arquivoLog, script, env) {
  const saida = fs.createWriteStream(path.join(pastaLogs(), arquivoLog));
  const filho = spawn(process.execPath, [path.join(__dirname, "filho.js"), script], {
    cwd: path.dirname(script),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ...env },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    windowsHide: true,
  });
  filho.stdout.pipe(saida);
  filho.stderr.pipe(saida);
  if (!app.isPackaged) {
    filho.stdout.pipe(process.stdout);
    filho.stderr.pipe(process.stderr);
  }
  filhos.push(filho);

  filho.on("error", (erro) => falhar(`Não consegui iniciar o ${nome}: ${erro.message}`));
  filho.on("exit", (codigo) => {
    const i = filhos.indexOf(filho);
    if (i >= 0) filhos.splice(i, 1);
    if (!encerrando) {
      falhar(`O ${nome} parou sozinho (código ${codigo}).`, saida.path);
    }
  });
}

function encerrarFilhos() {
  for (const filho of filhos.splice(0)) filho.kill();
}

// ---------- banco ----------

// Aplica as migrações pendentes. Num banco novo, cria as tabelas; numa
// versão nova do app instalada por cima, traz o banco para o schema novo.
// Roda toda abertura: quando não há nada pendente leva um ou dois segundos.
function migrar(c, databaseUrl) {
  const arquivoLog = path.join(pastaLogs(), "migracao.log");
  const saida = fs.createWriteStream(arquivoLog);
  return new Promise((resolve, reject) => {
    const p = spawn(
      process.execPath,
      [c.prismaCli, "migrate", "deploy", "--schema", c.schema],
      {
        // Fora da pasta do backend: em desenvolvimento, o Prisma leria o
        // backend/.env de lá (e o Postgres de desenvolvimento).
        cwd: app.getPath("userData"),
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1",
          DATABASE_URL: databaseUrl,
          // Sem internet no PC do gestor: nada de checar versão nova.
          CHECKPOINT_DISABLE: "1",
          PRISMA_HIDE_UPDATE_MESSAGE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    p.stdout.pipe(saida);
    p.stderr.pipe(saida);
    const timer = setTimeout(() => p.kill(), 180_000);
    p.on("error", (erro) => {
      clearTimeout(timer);
      reject(erro);
    });
    p.on("exit", (codigo) => {
      clearTimeout(timer);
      if (codigo === 0) resolve();
      else reject(new ErroComLog("Não consegui atualizar o banco de dados (migrações).", arquivoLog));
    });
  });
}

// ---------- backend ----------

// O backend recusa subir sem JWT_SECRET. Cada instalação gera o seu na
// primeira execução e guarda em userData (%APPDATA%\OEF): assim não há
// segredo fixo dentro do instalador, e reinstalar não derruba as sessões.
function segredoJwt() {
  const arquivo = path.join(app.getPath("userData"), "jwt-secret.txt");
  try {
    const salvo = fs.readFileSync(arquivo, "utf8").trim();
    if (salvo.length >= 32) return salvo;
  } catch {
    // ainda não existe: gera abaixo
  }
  const novo = crypto.randomBytes(48).toString("hex");
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, novo, { encoding: "utf8", mode: 0o600 });
  return novo;
}

function iniciarBack(script, databaseUrl) {
  iniciarFilho("servidor da API", "api.log", script, {
    NODE_ENV: "production",
    PORT: String(PORTA_API),
    HOST: "127.0.0.1",
    FRONTEND_URL: ORIGEM_FRONT,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: segredoJwt(),
    // Produção, mas em http://localhost: cookie `secure` não seria aceito.
    COOKIE_SEGURO: "false",
  });
}

function iniciarFront(servidor) {
  iniciarFilho("servidor da interface", "interface.log", servidor, {
    NODE_ENV: "production",
    PORT: String(PORTA_FRONT),
    HOSTNAME: "127.0.0.1",
  });
}

// ---------- janelas ----------

// Janelinha de "abrindo": na primeira vez o banco é criado do zero e leva
// alguns segundos. Sem ela, o gestor clica no ícone e nada aparece — e
// clica de novo.
function mostrarAguarde() {
  aguarde = new BrowserWindow({
    width: 380,
    height: 150,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#0f766e",
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;color:#fff;background:#0f766e">
    <div style="font-size:20px;font-weight:700;letter-spacing:.05em">OEF SISTEMA</div>
    <div style="margin-top:8px;font-size:13px;opacity:.85">Abrindo… (na primeira vez pode levar até 1 ou 2 minutos)</div></body>`;
  aguarde.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  aguarde.once("ready-to-show", () => aguarde?.show());
  aguarde.on("closed", () => {
    aguarde = null;
  });
}

function ehHttp(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function criarJanela(c) {
  janela = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: "OEF Sistema",
    icon: c.icone,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      // A página é só um site: não precisa de (e não deve ter) acesso
      // ao Node. Se um dia entrar um XSS, ele não vira acesso ao PC.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  janela.once("ready-to-show", () => {
    if (aguarde) aguarde.destroy();
    janela.show();
  });
  janela.on("closed", () => {
    janela = null;
  });

  const origemPermitida = (url) =>
    url.startsWith(ORIGEM_FRONT) || url.startsWith(ORIGEM_API);

  // Link externo abre no navegador do sistema, não dentro do app; a
  // janela do OEF só mostra o OEF.
  function abrirFora(url) {
    if (ehHttp(url)) shell.openExternal(url);
  }

  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (!origemPermitida(url)) abrirFora(url);
    return { action: "deny" };
  });
  janela.webContents.on("will-navigate", (evento, url) => {
    if (!origemPermitida(url)) {
      evento.preventDefault();
      abrirFora(url);
    }
  });

  // "PDF ↓" é um link para o backend que responde com
  // `Content-Disposition: attachment`; o Electron trata como download e
  // pergunta onde salvar. Ao terminar, mostra o arquivo na pasta.
  janela.webContents.session.on("will-download", (_evento, item) => {
    item.once("done", (_e, estado) => {
      if (estado === "completed") shell.showItemInFolder(item.getSavePath());
    });
  });

  if (MODO_DEV) janela.webContents.openDevTools({ mode: "detach" });

  // Toda abertura começa sem sessão. O cookie de login dura 8 horas e o
  // Electron o guarda em disco: sem isto, o gestor que fechou o app sem
  // clicar em "Sair" deixaria o próximo entrar já logado como ele. Na
  // abertura (e não ao fechar) para valer também depois de uma queda.
  // Só os cookies: preferências como o tema (localStorage) ficam.
  janela.webContents.session
    .clearStorageData({ storages: ["cookies"] })
    .catch(() => {})
    .finally(() => janela?.loadURL(ORIGEM_FRONT));
}

// ---------- ciclo de vida ----------

async function iniciar() {
  Menu.setApplicationMenu(null);
  fs.mkdirSync(pastaLogs(), { recursive: true });

  // As portas são fixas; se já há algo nelas, em desenvolvimento costuma
  // ser o `pnpm dev`/`pnpm start:dev` esquecido aberto.
  for (const [porta, url] of [
    [PORTA_API, TESTE_API],
    [PORTA_FRONT, TESTE_FRONT],
  ]) {
    if (await responde(url)) {
      return falhar(
        `A porta ${porta} já está em uso por outro programa, e o OEF precisa dela.\n` +
          "Feche esse programa (em desenvolvimento: `pnpm dev` / `pnpm start:dev`) e abra o OEF de novo.",
      );
    }
  }

  const c = caminhos();
  if (!fs.existsSync(c.back)) {
    return falhar(`Não achei o backend compilado (${c.back}).\nRode \`pnpm back:build\` na pasta desktop.`);
  }
  if (!fs.existsSync(c.front)) {
    return falhar(`Não achei a interface compilada (${c.front}).\nRode \`pnpm front:build\` na pasta desktop.`);
  }

  mostrarAguarde();

  banco = criarBanco(app, pastaLogs());
  let databaseUrl;
  try {
    databaseUrl = await banco.iniciar();
  } catch (erro) {
    return falhar(`Não consegui abrir o banco de dados.\n${erro.message}`, banco.logServidor);
  }

  try {
    await migrar(c, databaseUrl);
  } catch (erro) {
    return falhar(erro.message, erro.arquivoLog);
  }

  // A API e a interface sobem juntas; a janela só abre quando as duas respondem.
  iniciarBack(c.back, databaseUrl);
  iniciarFront(c.front);

  // Até 2 minutos (240 x 0,5 s). Normalmente sobem em poucos segundos, mas
  // na PRIMEIRA abertura depois de instalar o antivírus do Windows examina
  // cada um dos ~25 mil arquivos novos ao serem lidos, e a API chegou a
  // levar 25-30 s nos testes. Com 30 s de limite, o app desistia à toa.
  const [apiOk, frontOk] = await Promise.all([
    esperarResponder(TESTE_API, 240),
    esperarResponder(TESTE_FRONT, 240),
  ]);
  if (!apiOk) return falhar("A API não respondeu em 2 minutos.", path.join(pastaLogs(), "api.log"));
  if (!frontOk) {
    return falhar("A interface não respondeu em 2 minutos.", path.join(pastaLogs(), "interface.log"));
  }

  criarJanela(c);
}

// Fechar: para a API e a interface, depois desliga o banco de forma limpa.
// O before-quit é síncrono, então segura a saída (preventDefault) até o
// banco terminar, e só então sai de verdade.
let saidaLiberada = false;
function aoSair(evento) {
  if (saidaLiberada) return;
  evento.preventDefault();
  if (encerrando) return;
  encerrando = true;
  encerrarFilhos();
  Promise.resolve(banco?.parar()).finally(() => {
    saidaLiberada = true;
    app.quit();
  });
}

// Portas fixas: duas cópias do app brigariam por elas. A segunda só traz
// a primeira para a frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
    }
  });
  app.on("before-quit", aoSair);
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(() =>
    iniciar().catch((erro) => falhar(`Erro inesperado ao abrir o OEF:\n${erro?.stack ?? erro}`)),
  );
}
