// Roda os scripts de dados do backend contra o banco EMBUTIDO do app
// (e não contra o Postgres de desenvolvimento do backend/.env).
//
//   pnpm banco:usuario   -> cria/atualiza o gestor (ADMIN_EMAIL/ADMIN_SENHA do backend/.env)
//   pnpm banco:cenarios  -> monta os cenários de teste (empresa "Cenários de Teste Ltda")
//
// O app precisa estar ABERTO: é ele que deixa o banco ligado.
// Ferramenta de desenvolvimento; o gestor final não usa isto.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { PORTA_BANCO, NOME_BANCO } = require("../banco");

const comandos = {
  usuario: ["exec", "ts-node", "prisma/seed-usuario.ts"],
  cenarios: ["seed:cenarios"],
};

const qual = process.argv[2];
if (!comandos[qual]) {
  console.error(`Uso: node scripts/banco.js <${Object.keys(comandos).join("|")}>`);
  process.exit(1);
}

const arquivoSenha = path.join(process.env.APPDATA ?? "", "OEF", "postgres", "senha.txt");
let senha;
try {
  senha = fs.readFileSync(arquivoSenha, "utf8").trim();
} catch {
  console.error(`Não achei ${arquivoSenha}.\nAbra o app (pnpm start) pelo menos uma vez antes.`);
  process.exit(1);
}

const url = `postgresql://postgres:${senha}@127.0.0.1:${PORTA_BANCO}/${NOME_BANCO}?schema=public`;
const r = spawnSync("pnpm", ["--dir", path.join(__dirname, "..", "..", "backend"), ...comandos[qual]], {
  stdio: "inherit",
  shell: true,
  // DATABASE_URL já definida ganha do backend/.env (que só preenche o que falta).
  env: { ...process.env, DATABASE_URL: url },
});
if (r.status !== 0) {
  console.error("\nFalhou. O app está aberto? Sem ele o banco embutido fica desligado.");
}
process.exit(r.status ?? 1);
