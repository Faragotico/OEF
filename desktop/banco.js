"use strict";

// Postgres embutido do OEF desktop.
//
// O app leva os binários do Postgres (pacote @embedded-postgres/windows-x64)
// e guarda o banco em %APPDATA%\OEF\postgres — nada de Postgres instalado
// na máquina do gestor. Este módulo:
//
//   1. cria o banco na primeira vez (initdb), com senha própria;
//   2. sobe o servidor a cada abertura (pg_ctl start);
//   3. desliga do jeito certo ao fechar (pg_ctl stop -m fast).
//
// Por que pg_ctl e não a biblioteca "embedded-postgres": no Windows ela
// desliga o banco com `taskkill /f`, o equivalente a puxar a tomada. O
// banco aguenta (recupera pelo WAL), mas faz isso toda vez. O pg_ctl
// desliga de forma limpa.
//
// As migrações (prisma migrate deploy) ficam no main.js, porque dependem
// de onde está o backend.

const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Porta fixa e fora do padrão (5432) para não brigar com um Postgres que
// já exista na máquina. Só escuta em 127.0.0.1: o banco não fica na rede.
const PORTA_BANCO = 54329;
const NOME_BANCO = "oef";

function pastaBinarios(app) {
  return app.isPackaged
    ? path.join(process.resourcesPath, "postgres", "bin")
    : path.join(__dirname, "node_modules", "@embedded-postgres", "windows-x64", "native", "bin");
}

// Roda um executável do Postgres e devolve o código de saída.
//
// stdio "ignore" é obrigatório no pg_ctl start: o servidor herda as alças
// de saída de quem o chamou, e com "pipe" o processo pai ficaria esperando
// um fim de saída que nunca chega (o servidor continua rodando).
function rodar(executavel, args, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const filho = spawn(executavel, args, { stdio: "ignore", windowsHide: true });
    const timer = setTimeout(() => {
      filho.kill();
      reject(new Error(`${path.basename(executavel)} não terminou em ${timeoutMs / 1000}s.`));
    }, timeoutMs);
    filho.on("error", (erro) => {
      clearTimeout(timer);
      reject(erro);
    });
    filho.on("exit", (codigo) => {
      clearTimeout(timer);
      resolve(codigo ?? 1);
    });
  });
}

function criarBanco(app, pastaLogs) {
  const bin = pastaBinarios(app);
  const exe = (nome) => path.join(bin, `${nome}.exe`);
  const pastaBase = path.join(app.getPath("userData"), "postgres");
  const pastaDados = path.join(pastaBase, "data");
  const arquivoSenha = path.join(pastaBase, "senha.txt");
  const logServidor = path.join(pastaLogs, "postgres.log");
  let iniciadoPorNos = false;

  function senha() {
    try {
      return fs.readFileSync(arquivoSenha, "utf8").trim();
    } catch {
      return null;
    }
  }

  async function inicializarSeNecessario() {
    if (fs.existsSync(path.join(pastaDados, "PG_VERSION"))) return;

    // Pasta sem PG_VERSION = initdb que não terminou (app fechado no meio).
    // Recomeçar do zero é seguro: ainda não há dado nenhum ali.
    fs.rmSync(pastaDados, { recursive: true, force: true });
    fs.mkdirSync(pastaBase, { recursive: true });

    // Senha aleatória por instalação. Hex: não precisa escapar na URL.
    const nova = crypto.randomBytes(24).toString("hex");
    fs.writeFileSync(arquivoSenha, nova, { encoding: "utf8" });
    // O initdb lê a senha de um arquivo (na linha de comando ela ficaria
    // visível na lista de processos). Apagado logo depois.
    const arquivoTemp = path.join(pastaBase, "pw-inicial.tmp");
    fs.writeFileSync(arquivoTemp, nova, { encoding: "utf8" });
    try {
      const codigo = await rodar(exe("initdb"), [
        "-D", pastaDados,
        "-U", "postgres",
        `--pwfile=${arquivoTemp}`,
        "-A", "scram-sha-256",
        "-E", "UTF8",
        // Ordenação em português (ICU): "Álvaro" fica junto dos "A", e não
        // depois do "Z" como na ordenação binária.
        "--locale-provider=icu",
        "--icu-locale=pt-BR",
        "--locale=C",
      ]);
      if (codigo !== 0) throw new Error(`initdb terminou com código ${codigo}.`);
    } finally {
      fs.rmSync(arquivoTemp, { force: true });
    }
  }

  async function estaRodando() {
    return (await rodar(exe("pg_ctl"), ["status", "-D", pastaDados], 30_000)) === 0;
  }

  async function iniciar() {
    await inicializarSeNecessario();
    const s = senha();
    if (!s) {
      throw new Error(
        `O banco existe, mas a senha dele sumiu (${arquivoSenha}).\n` +
          "Sem ela não há como conectar.",
      );
    }

    // Servidor ainda de pé = o app caiu da última vez sem desligar o banco.
    // É o nosso (a pasta de dados é nossa): desliga e sobe de novo, para
    // começar sempre do mesmo estado.
    if (await estaRodando()) {
      await rodar(exe("pg_ctl"), ["stop", "-D", pastaDados, "-m", "fast", "-w", "-t", "30"]);
    } else {
      // Trava velha de uma queda: sem servidor rodando, pode apagar.
      fs.rmSync(path.join(pastaDados, "postmaster.pid"), { force: true });
    }

    fs.mkdirSync(pastaLogs, { recursive: true });
    fs.rmSync(logServidor, { force: true }); // log só da abertura atual
    const codigo = await rodar(exe("pg_ctl"), [
      "start",
      "-D", pastaDados,
      "-l", logServidor,
      "-w",
      "-t", "60",
      "-o", `-p ${PORTA_BANCO} -h 127.0.0.1`,
    ]);
    if (codigo !== 0) {
      throw new Error(
        `O banco de dados não subiu (pg_ctl código ${codigo}).\n` +
          `A porta ${PORTA_BANCO} pode estar em uso por outro programa.`,
      );
    }
    iniciadoPorNos = true;
    return `postgresql://postgres:${s}@127.0.0.1:${PORTA_BANCO}/${NOME_BANCO}?schema=public`;
  }

  async function parar() {
    if (!iniciadoPorNos) return;
    iniciadoPorNos = false;
    await rodar(exe("pg_ctl"), ["stop", "-D", pastaDados, "-m", "fast", "-w", "-t", "30"], 40_000).catch(
      () => {},
    );
  }

  return { iniciar, parar, logServidor };
}

module.exports = { criarBanco, PORTA_BANCO, NOME_BANCO };
