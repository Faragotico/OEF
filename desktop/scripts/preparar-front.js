// Roda depois do `next build` com output "standalone".
//
// O servidor standalone (.next/standalone/server.js) leva só o código do
// servidor e as dependências que ele usa. Duas pastas ficam de fora de
// propósito (a ideia do Next é você servi-las por um CDN) e, como aqui
// não há CDN, precisam ser copiadas para dentro dele: .next/static (JS e
// CSS do navegador) e public (ícones e imagens). Sem isso a página abre
// sem estilo e sem scripts.
const fs = require("node:fs");
const path = require("node:path");

const front = path.resolve(__dirname, "..", "..", "frontend");
const standalone = path.join(front, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error(
    "Não achei frontend/.next/standalone/server.js.\n" +
      'O build do frontend rodou com `output: "standalone"` no next.config.ts?',
  );
  process.exit(1);
}

function copiar(de, para) {
  fs.rmSync(para, { recursive: true, force: true });
  fs.cpSync(de, para, { recursive: true });
  console.log("copiado:", path.relative(front, para));
}

copiar(
  path.join(front, ".next", "static"),
  path.join(standalone, ".next", "static"),
);
copiar(path.join(front, "public"), path.join(standalone, "public"));
