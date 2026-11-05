import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone: um servidor Node autocontido (server.js + só
  // as dependências usadas). É isso que o app desktop (pasta /desktop,
  // Electron) empacota. `pnpm dev` não muda; `pnpm start` passa a avisar
  // que o certo é rodar o server.js de dentro de .next/standalone.
  output: "standalone",
  // Raiz usada para descobrir o que entra no standalone. Fixar evita o
  // Next "adivinhar" uma pasta acima caso ache outro lockfile por aí.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
