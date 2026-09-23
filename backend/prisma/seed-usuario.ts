// Cria (ou atualiza) o primeiro usuário. npx ts-node prisma/seed-usuario.ts
//
// Senha vem só de variável de ambiente (ADMIN_EMAIL, ADMIN_NOME,
// ADMIN_SENHA) — nunca em código versionado. Rodar de novo troca a
// senha (upsert): é o "esqueci a senha" enquanto não há tela pra isso.
import { PrismaClient } from '@prisma/client';
import { gerarHashSenha } from '../src/helpers/seguranca.helpers';

const prisma = new PrismaClient();

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // sem .env: usa o que já estiver no ambiente
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME?.trim() || 'Gestor';

  if (!email || !senha) {
    throw new Error(
      'Defina ADMIN_EMAIL e ADMIN_SENHA antes de rodar.\n' +
        'Exemplo (PowerShell):\n' +
        '  $env:ADMIN_EMAIL="gestor@sharonpontes.com.br"; $env:ADMIN_SENHA="uma senha boa"; npx ts-node prisma/seed-usuario.ts',
    );
  }
  if (senha.length < 8) {
    throw new Error('A senha inicial precisa ter ao menos 8 caracteres.');
  }

  const senhaHash = gerarHashSenha(senha);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { senhaHash, nome },
    create: { email, nome, senhaHash, papel: 'gestor' },
  });

  console.log(`✅ Usuário pronto: ${usuario.nome} <${usuario.email}> (papel: ${usuario.papel})`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
