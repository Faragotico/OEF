// Monta a pasta desktop/pacote com tudo o que vai DENTRO do instalador,
// fora o próprio Electron. O electron-builder copia a pasta INTEIRA para
// resources/ ("extraResources" no package.json) — e tem que ser inteira:
// item por item, ele descartaria o node_modules da raiz de cada um.
//
//   pacote/frontend  -> o servidor standalone do Next, com os arquivos de verdade
//   pacote/backend   -> o backend compilado + dependências de produção (npm)
//   pacote/postgres  -> os binários do Postgres embutido
//   pacote/icone.png -> ícone da janela
//
// Roda depois de `pnpm build` (backend e frontend compilados). Precisa de
// internet: o npm baixa as dependências do backend e o motor do Prisma.
//
// Por que copiar e reinstalar em vez de levar as pastas do repositório:
// o pnpm guarda as dependências como links simbólicos para um depósito
// central. No PC do gestor esse depósito não existe — os links
// apontariam para o nada. Aqui tudo vira arquivo de verdade.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DESKTOP = path.resolve(__dirname, "..");
const RAIZ = path.resolve(DESKTOP, "..");
const PACOTE = path.join(DESKTOP, "pacote");
const BACKEND = path.join(RAIZ, "backend");
const FRONTEND = path.join(RAIZ, "frontend");

function etapa(texto) {
  console.log(`\n▶ ${texto}`);
}

function exigir(caminho, dica) {
  if (!fs.existsSync(caminho)) {
    console.error(`Não achei ${caminho}.\n${dica}`);
    process.exit(1);
  }
}

function rodar(comando, args, cwd) {
  const r = spawnSync(comando, args, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`Falhou: ${comando} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

exigir(path.join(BACKEND, "dist", "src", "main.js"), "Rode `pnpm build` na pasta desktop antes.");
exigir(path.join(FRONTEND, ".next", "standalone", "server.js"), "Rode `pnpm build` na pasta desktop antes.");
exigir(path.join(FRONTEND, ".next", "standalone", ".next", "static"), "Rode `pnpm front:build` (copia o static).");

fs.rmSync(PACOTE, { recursive: true, force: true });
fs.mkdirSync(PACOTE, { recursive: true });

// ---------- frontend ----------
etapa("Frontend: copiando o standalone (sem o node_modules)");
const origemFront = path.join(FRONTEND, ".next", "standalone");
const destFront = path.join(PACOTE, "frontend");
// O node_modules do standalone fica de fora: com pnpm ele é feito de links
// (o "next" aponta para o depósito do pnpm), e copiar seguindo os links
// separa o next das dependências dele (@swc/helpers...) — a interface
// nem sobe. Reinstalar com npm, como no backend, dá a estrutura normal.
fs.cpSync(origemFront, destFront, {
  recursive: true,
  filter: (origem) => path.relative(origemFront, origem) !== "node_modules",
});
const pkgFront = JSON.parse(fs.readFileSync(path.join(origemFront, "package.json"), "utf8"));
fs.writeFileSync(
  path.join(destFront, "package.json"),
  JSON.stringify(
    { name: "oef-frontend", version: pkgFront.version, private: true, dependencies: pkgFront.dependencies },
    null,
    2,
  ),
);

etapa("Frontend: instalando next/react (npm)");
rodar("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-package-lock"], destFront);
// O compilador SWC (@next/swc-*, ~100 MB) só é usado no `next build`; o
// servidor pronto não precisa dele.
const pastaNext = path.join(destFront, "node_modules", "@next");
for (const nome of fs.existsSync(pastaNext) ? fs.readdirSync(pastaNext) : []) {
  if (nome.startsWith("swc-")) fs.rmSync(path.join(pastaNext, nome), { recursive: true, force: true });
}

// ---------- backend ----------
etapa("Backend: código compilado, schema e migrações");
const destBack = path.join(PACOTE, "backend");
// Só dist/src: dist/prisma e dist/scripts são os seeds compilados, que o
// app não usa.
fs.cpSync(path.join(BACKEND, "dist", "src"), path.join(destBack, "dist", "src"), { recursive: true });
fs.mkdirSync(path.join(destBack, "prisma"), { recursive: true });
fs.copyFileSync(path.join(BACKEND, "prisma", "schema.prisma"), path.join(destBack, "prisma", "schema.prisma"));
fs.cpSync(path.join(BACKEND, "prisma", "migrations"), path.join(destBack, "prisma", "migrations"), {
  recursive: true,
});
// NADA de backend/.env: ele tem a senha do Postgres de desenvolvimento e
// segredos. No app, o main.js passa tudo por variável de ambiente.

// Versões EXATAS das que estão instaladas no repositório (as testadas), e
// não "a mais nova que cabe no ^" que o npm escolheria.
const pkgBack = JSON.parse(fs.readFileSync(path.join(BACKEND, "package.json"), "utf8"));
const versaoInstalada = (nome) =>
  JSON.parse(fs.readFileSync(path.join(BACKEND, "node_modules", nome, "package.json"), "utf8")).version;
const dependencias = {};
for (const nome of Object.keys(pkgBack.dependencies)) dependencias[nome] = versaoInstalada(nome);
// O CLI do Prisma é "dev" no repositório, mas no app ele roda a cada
// abertura (prisma migrate deploy), então vai junto.
dependencias.prisma = versaoInstalada("prisma");

fs.writeFileSync(
  path.join(destBack, "package.json"),
  JSON.stringify({ name: "oef-backend", version: pkgBack.version, private: true, dependencies: dependencias }, null, 2),
);

etapa("Backend: instalando dependências de produção (npm)");
// npm (e não pnpm) porque ele cria node_modules com arquivos de verdade.
rodar("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-package-lock"], destBack);

etapa("Backend: gerando o cliente do Prisma");
rodar("node", [path.join("node_modules", "prisma", "build", "index.js"), "generate", "--schema", path.join("prisma", "schema.prisma")], destBack);

// Caches de download dos motores do Prisma: cópias dos mesmos binários
// que já estão no lugar certo (@prisma/engines). Só incham o instalador.
for (const cache of [
  path.join(destBack, "node_modules", ".cache"),
  path.join(destBack, "node_modules", "@prisma", "engines", "node_modules", ".cache"),
]) {
  fs.rmSync(cache, { recursive: true, force: true });
}

// ---------- postgres ----------
etapa("Postgres: copiando os binários");
const origemPg = path.join(DESKTOP, "node_modules", "@embedded-postgres", "windows-x64", "native");
exigir(path.join(origemPg, "bin", "postgres.exe"), "Rode `pnpm install` na pasta desktop.");
fs.cpSync(origemPg, path.join(PACOTE, "postgres"), {
  recursive: true,
  dereference: true,
  // wx*.dll são da interface gráfica do pgAdmin/StackBuilder, que vêm no
  // pacote de binários mas o servidor não usa: ~10 MB a menos.
  filter: (origem) => !/[\\/]wx[^\\/]*\.dll$/i.test(origem),
});

// ---------- ícone ----------
fs.copyFileSync(path.join(FRONTEND, "public", "android-chrome-512x512.png"), path.join(PACOTE, "icone.png"));

console.log("\n✅ Pacote pronto em desktop/pacote");
