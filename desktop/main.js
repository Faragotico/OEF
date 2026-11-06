"use strict";

// Processo principal do OEF desktop (Electron).
//
// O Electron sobe dois processos filhos — o backend (Nest, dist/src/main.js)
// e o servidor standalone do frontend — e abre uma janela apontando para o
// frontend. O banco (Postgres) AINDA roda solto, como no desenvolvimento:
// o passo 3 o traz para dentro do app.

const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { parseEnv } = require("node:util");

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
let encerrando = false;

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

function falhar(mensagem) {
  dialog.showErrorBox("OEF Sistema", mensagem);
  app.quit();
}

// ---------- processos filhos ----------

// Sobe um script Node usando o próprio Electron: process.execPath é o
// executável do Electron e, com ELECTRON_RUN_AS_NODE, ele se comporta como
// o Node comum. Assim o app não depende de ter Node instalado na máquina.
function iniciarFilho(nome, script, env) {
  const filho = spawn(process.execPath, [script], {
    cwd: path.dirname(script),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", ...env },
    stdio: "inherit",
    windowsHide: true,
  });
  filhos.push(filho);

  filho.on("exit", (codigo) => {
    const i = filhos.indexOf(filho);
    if (i >= 0) filhos.splice(i, 1);
    if (!encerrando) {
      falhar(`O ${nome} parou sozinho (código ${codigo}).`);
    }
  });
}

function encerrarFilhos() {
  encerrando = true;
  for (const filho of filhos.splice(0)) filho.kill();
}

// ---------- backend ----------

// Caminhos apontam para a pasta do repositório; quando virar instalador
// (passo 5) passam a usar process.resourcesPath.
function caminhoDoBackend() {
  // dist/src (e não dist/) porque o tsconfig também compila prisma/ e scripts/.
  return path.resolve(__dirname, "..", "backend", "dist", "src", "main.js");
}

// O backend recusa subir sem JWT_SECRET. Cada instalação gera o seu na
// primeira execução e guarda em userData (%APPDATA%/OEF): assim não há
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

// TEMPORÁRIO (até o passo 3, Postgres embutido): o banco ainda é o
// Postgres de desenvolvimento, e o endereço vem do backend/.env.
function urlDoBanco() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = parseEnv(
      fs.readFileSync(path.resolve(__dirname, "..", "backend", ".env"), "utf8"),
    );
    return env.DATABASE_URL;
  } catch {
    return undefined;
  }
}

function iniciarBack(script, databaseUrl) {
  iniciarFilho("servidor da API", script, {
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

// ---------- frontend ----------

// Onde está o server.js gerado por `next build`.
function caminhoDoServidorFront() {
  return path.resolve(__dirname, "..", "frontend", ".next", "standalone", "server.js");
}

function iniciarFront(servidor) {
  iniciarFilho("servidor da interface", servidor, {
    NODE_ENV: "production",
    PORT: String(PORTA_FRONT),
    HOSTNAME: "127.0.0.1",
  });
}

// ---------- janela ----------

function ehHttp(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: "OEF Sistema",
    icon: path.join(__dirname, "..", "frontend", "public", "android-chrome-512x512.png"),
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

  janela.once("ready-to-show", () => janela.show());
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

  janela.loadURL(ORIGEM_FRONT);
}

// ---------- ciclo de vida ----------

async function iniciar() {
  Menu.setApplicationMenu(null);

  // As portas são fixas; se já há algo nelas, provavelmente é o
  // `pnpm dev`/`pnpm start:dev` do desenvolvimento esquecido aberto.
  if (await responde(TESTE_API)) {
    return falhar(
      `A porta ${PORTA_API} já está em uso.\n` +
        "Se o backend está rodando com `pnpm start:dev`, pare ele e abra o OEF de novo.",
    );
  }
  if (await responde(TESTE_FRONT)) {
    return falhar(
      `A porta ${PORTA_FRONT} já está em uso.\n` +
        "Se o frontend está rodando com `pnpm dev`, pare ele e abra o OEF de novo.",
    );
  }

  const back = caminhoDoBackend();
  if (!fs.existsSync(back)) {
    return falhar(
      "Não achei o backend compilado (backend/dist/src/main.js).\n" +
        "Rode `pnpm back:build` na pasta desktop.",
    );
  }
  const front = caminhoDoServidorFront();
  if (!fs.existsSync(front)) {
    return falhar(
      "Não achei o frontend compilado (frontend/.next/standalone/server.js).\n" +
        "Rode `pnpm front:build` na pasta desktop.",
    );
  }
  const databaseUrl = urlDoBanco();
  if (!databaseUrl) {
    return falhar(
      "Não achei DATABASE_URL (nem no ambiente, nem em backend/.env).\n" +
        "Neste passo o Postgres ainda roda separado: configure o backend/.env.",
    );
  }

  // Os dois sobem juntos; a janela só abre quando ambos respondem.
  iniciarBack(back, databaseUrl);
  iniciarFront(front);

  const [apiOk, frontOk] = await Promise.all([
    esperarResponder(TESTE_API, 60),
    esperarResponder(TESTE_FRONT, 60),
  ]);
  if (!apiOk) return falhar("A API não respondeu em 30 segundos.");
  if (!frontOk) return falhar("A interface não respondeu em 30 segundos.");

  criarJanela();
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
  app.on("before-quit", encerrarFilhos);
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(iniciar);
}
