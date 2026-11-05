"use strict";

// Processo principal do OEF desktop (Electron).
//
// Passo 1 (este arquivo): o Electron sobe o servidor standalone do
// frontend e abre uma janela apontando para ele. O backend (Nest) e o
// banco AINDA rodam soltos, como no desenvolvimento — os próximos passos
// os trazem para dentro do app.

const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORTA_FRONT = 3000;
// A janela abre em "localhost" (e não 127.0.0.1) de propósito: a API
// também é "localhost:3001", e cookie é por nome de host. Misturar os
// dois nomes faria o cookie de login não chegar ao backend.
const ORIGEM_FRONT = `http://localhost:${PORTA_FRONT}`;
const ORIGEM_API = "http://localhost:3001";
// O servidor escuta no IP direto; é só a checagem de "já subiu?".
const TESTE_FRONT = `http://127.0.0.1:${PORTA_FRONT}`;

const MODO_DEV = process.argv.includes("--dev");

let filhoFront = null;
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

// ---------- servidor do frontend ----------

// Onde está o server.js gerado por `next build`. Em desenvolvimento é a
// pasta do frontend; quando virar instalador (passo 5) ele passa a ir
// junto do app e este caminho muda.
function caminhoDoServidorFront() {
  return path.resolve(__dirname, "..", "frontend", ".next", "standalone", "server.js");
}

function iniciarFront(servidor) {
  // process.execPath é o próprio Electron; com ELECTRON_RUN_AS_NODE ele
  // se comporta como o Node comum. Assim o app não depende de ter Node
  // instalado na máquina de quem vai usar.
  filhoFront = spawn(process.execPath, [servidor], {
    cwd: path.dirname(servidor),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORTA_FRONT),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "inherit",
    windowsHide: true,
  });

  filhoFront.on("exit", (codigo) => {
    filhoFront = null;
    if (!encerrando) {
      falhar(`O servidor da interface parou sozinho (código ${codigo}).`);
    }
  });
}

function encerrarFront() {
  encerrando = true;
  if (filhoFront) {
    filhoFront.kill();
    filhoFront = null;
  }
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

  if (await responde(TESTE_FRONT)) {
    return falhar(
      `A porta ${PORTA_FRONT} já está em uso.\n` +
        "Se o frontend está rodando com `pnpm dev`, pare ele e abra o OEF de novo.",
    );
  }

  if (!(await responde(ORIGEM_API))) {
    return falhar(
      `Não consegui falar com o backend em ${ORIGEM_API}.\n` +
        "Neste passo ele ainda roda separado: suba o Postgres e rode `pnpm start:dev` na pasta backend.",
    );
  }

  const servidor = caminhoDoServidorFront();
  if (!fs.existsSync(servidor)) {
    return falhar(
      "Não achei o frontend compilado (frontend/.next/standalone/server.js).\n" +
        "Rode `pnpm front:build` na pasta desktop.",
    );
  }

  iniciarFront(servidor);

  if (!(await esperarResponder(TESTE_FRONT, 60))) {
    return falhar("A interface não respondeu em 30 segundos.");
  }

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
  app.on("before-quit", encerrarFront);
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(iniciar);
}
