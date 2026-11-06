// Tira as fotos das telas usadas na ajuda contextual (frontend/public/ajuda).
//
// Rodar na pasta desktop, com o frontend (:3000) e a API (:3001) no ar:
//   pnpm ajuda:fotos
// Entra com ADMIN_EMAIL/ADMIN_SENHA do backend/.env. As fotos mostram os
// dados que estiverem no banco: antes de tirar as definitivas, popule com
// dados de demonstração (seed) em vez de dados de teste.
const { app, BrowserWindow, nativeTheme } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");

const FRONT = "http://localhost:3000";
const API = "http://localhost:3001";
const RAIZ = path.resolve(__dirname, "..", "..");
const SAIDA = path.join(RAIZ, "frontend", "public", "ajuda");
const env = parseEnv(fs.readFileSync(path.join(RAIZ, "backend", ".env"), "utf8"));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(win, rota) {
  await win.loadURL(FRONT + rota);
  await espera(2500);
}

async function capturar(win, nome, seletor = "main") {
  const rect = await win.webContents.executeJavaScript(`(() => {
    const el = document.querySelector(${JSON.stringify(seletor)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)),
             width: Math.floor(Math.min(r.width, innerWidth - r.left)),
             height: Math.floor(Math.min(r.height, innerHeight - Math.max(0, r.top))) };
  })()`);
  if (!rect) throw new Error(`${nome}: não achei ${seletor}`);
  const img = await win.webContents.capturePage(rect);
  fs.writeFileSync(path.join(SAIDA, `${nome}.png`), img.toPNG());
  console.log("ok", nome, rect.width + "x" + rect.height);
}

async function clicarBotao(win, texto) {
  const ok = await win.webContents.executeJavaScript(`(() => {
    const b = [...document.querySelectorAll("button, a")].find((e) => e.textContent.includes(${JSON.stringify(texto)}));
    if (b) b.click();
    return !!b;
  })()`);
  if (!ok) throw new Error("botão não achado: " + texto);
  await espera(1200);
}

app.whenReady().then(async () => {
  nativeTheme.themeSource = "light";
  fs.mkdirSync(SAIDA, { recursive: true });
    // Janela oculta. backgroundThrottling: false porque, oculta, o Chromium
  // congela as animações e o popup (que entra com fade-in) saía em branco.
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    show: false,
    webPreferences: { backgroundThrottling: false },
  });
  try {
    await abrir(win, "/login");
    const login = await win.webContents.executeJavaScript(`
      localStorage.setItem("theme", "light");
      fetch(${JSON.stringify(API)} + "/auth/login", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ${JSON.stringify(env.ADMIN_EMAIL)}, senha: ${JSON.stringify(env.ADMIN_SENHA)} }),
      }).then((r) => r.status)`);
    if (login !== 200) throw new Error("login falhou: " + login);

    for (const [nome, rota] of [
      ["inicio", "/"],
      ["empresas", "/empresas"],
      ["postos", "/postos"],
      ["turnos", "/turnos"],
      ["cargos", "/cargos"],
      ["funcionarios", "/funcionarios"],
      ["ausencias", "/ausencias"],
      ["regras", "/regras"],
      ["escalas", "/escalas"],
      ["gerar-escala", "/escalas/gerar"],
      ["alocacoes", "/alocacoes"],
    ]) {
      await abrir(win, rota);
      await capturar(win, nome);
    }

    // Formulário de funcionário com a lista de posto aberta, mostrando a busca.
    await abrir(win, "/funcionarios");
    await clicarBotao(win, "+ Novo Funcionário");
    await win.webContents.executeJavaScript(`(() => {
      const campo = document.querySelector('[aria-label="Posto de trabalho"]');
      campo?.focus();
    })()`);
    await espera(1500);
    await capturar(win, "funcionario-form", ".animate-fade-in-up");

    // Grade: a escala mais recente.
    const id = await win.webContents.executeJavaScript(
      `fetch(${JSON.stringify(API)} + "/escalas/opcoes", { credentials: "include" }).then((r) => r.json()).then((l) => (l[l.length - 1] || {}).id)`,
    );
    if (id) {
      await abrir(win, `/escalas/${id}`);
      await capturar(win, "escala-grade");
    } else console.log("sem escala cadastrada: escala-grade pulada");
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.quit();
});
