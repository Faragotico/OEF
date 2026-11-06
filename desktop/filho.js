"use strict";

// Ponto de entrada dos processos filhos (API e interface).
//
// Uso: <electron com ELECTRON_RUN_AS_NODE> filho.js <script>
//
// O main.js abre um canal IPC com cada filho. Se o app fechar normalmente,
// ele mata os filhos; mas se o app CAIR (ou for encerrado à força), no
// Windows os filhos continuariam vivos segurando as portas 3000 e 3001 — e
// a próxima abertura daria "porta em uso". O canal resolve: quando o pai
// morre, o canal se desconecta e o filho sai junto.
const path = require("node:path");

process.on("disconnect", () => process.exit(0));

const script = path.resolve(process.argv[2]);
// Tira o próprio filho.js dos argumentos: o script roda como se tivesse
// sido chamado direto.
process.argv.splice(1, 1);
require(script);
