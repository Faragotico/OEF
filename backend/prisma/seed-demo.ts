// ============================================================
// Massa de dados pra apresentação/banca: 20 empresas clientes, 5
// postos cada (100 no total), 5 funcionários por posto (3 titulares +
// 2 coringas, mesma proporção do seed.ts) = 500 funcionários.
//
//   pnpm exec ts-node prisma/seed-demo.ts
//
// Idempotente: roda de novo sem duplicar (upsert por CNPJ/CPF, posto e
// turno achados antes de criar). É só pra ter volume real pra mostrar
// — mesma grade de turnos e mesmo raciocínio titular/coringa do
// seed.ts, só que em escala.
// ============================================================
try {
  process.loadEnvFile();
} catch {
  // sem .env: usa o que já estiver no ambiente
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

// [dom, seg, ter, qua, qui, sex, sáb]
const TODO_DIA = [1, 1, 1, 1, 1, 1, 1];
const FECHA_DOMINGO = [0, 1, 1, 1, 1, 1, 1];

const TURNOS_DO_POSTO = [
  { descricao: 'Abertura', inicio: '07:00', fim: '15:00', demanda: TODO_DIA },
  { descricao: 'Tarde', inicio: '13:00', fim: '21:00', demanda: TODO_DIA },
  { descricao: 'Fechamento', inicio: '15:00', fim: '23:00', demanda: FECHA_DOMINGO },
];

// CPF — mesmo algoritmo do trigger fn_valida_cpf (mod 11).
function cpfValido(baseNove: string): string {
  const n = baseNove.split('').map(Number);
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += n[i] * (10 - i);
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  const n10 = [...n, d1];
  soma = 0;
  for (let i = 0; i < 10; i++) soma += n10[i] * (11 - i);
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return `${baseNove}${d1}${d2}`;
}

// CNPJ — mesmo algoritmo do trigger fn_valida_cnpj (mod 11 sobre o
// valor ASCII-48; usando só dígitos, que são um subconjunto válido do
// formato alfanumérico de 2026).
function cnpjValido(baseDoze: string): string {
  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const n = baseDoze.split('').map(Number);
  let soma1 = 0;
  let soma2 = 0;
  for (let j = 0; j < 12; j++) {
    soma1 += n[j] * pesos[j + 1];
    soma2 += n[j] * pesos[j];
  }
  const d1 = soma1 % 11 < 2 ? 0 : 11 - (soma1 % 11);
  soma2 += d1 * pesos[12];
  const d2 = soma2 % 11 < 2 ? 0 : 11 - (soma2 % 11);
  return `${baseDoze}${d1}${d2}`;
}

const NOMES_EMPRESA = [
  'Supermercado Bom Preço', 'Mercado Popular', 'Atacadão Sul', 'Hiper Vale Verde',
  'Mercadinho Estrela', 'Supermercados União', 'Comercial Paraná', 'Mercado Central',
  'Rede Economia', 'Atacarejo Norte', 'Supermercado Família', 'Mercado Bela Vista',
  'Comercial Sul-Brasil', 'Rede Vitória', 'Supermercado Progresso', 'Mercado Ponta Grossa',
  'Atacadão Coroados', 'Supermercados Aurora', 'Mercado Boa Safra', 'Rede Comercial PR',
];

const CIDADES = ['Ponta Grossa', 'Castro', 'Carambeí', 'Palmeira', 'Curitiba', 'Irati', 'Guarapuava', 'Telêmaco Borba'];
const DIRECOES = ['Centro', 'Norte', 'Sul', 'Leste', 'Oeste'];

const PRIMEIROS = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Rafael', 'Elaine', 'Fábio', 'Giovana', 'Hugo', 'Sabrina',
  'Isabela', 'João', 'Karina', 'Lucas', 'Tiago', 'Mariana', 'Nelson', 'Otávio', 'Patrícia', 'Vinícius',
  'Camila', 'Rodrigo', 'Fernanda', 'Gustavo', 'Juliana', 'Marcelo', 'Renata', 'Thiago', 'Aline', 'Eduardo',
  'Priscila', 'Leonardo', 'Vanessa', 'Rogério', 'Cristiane',
];
const SOBRENOMES = [
  'Ferreira', 'Lima', 'Ribeiro', 'Souza', 'Prado', 'Pires', 'Nunes', 'Melo', 'Barros', 'Cardoso',
  'Cunha', 'Teixeira', 'Moreira', 'Farias', 'Rocha', 'Batista', 'Xavier', 'Correia', 'Vieira', 'Barbosa',
  'Almeida', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Gomes', 'Martins', 'Araújo', 'Dias', 'Castro',
];
const CARGOS = ['Porteiro', 'Recepcionista'];

async function garantirRegraPadrao() {
  const existente = await prisma.regra.findFirst({ where: { tipo: 'escala', valor: '5x1' } });
  if (!existente) {
    await prisma.regra.create({
      data: { descricao: '5x1', tipo: 'escala', valor: '5x1', padrao: true },
    });
  } else if (!existente.padrao) {
    // Já existia (ex: rodou o seed.ts antes, que cria sem marcar
    // padrão) — só liga a flag, não duplica a linha.
    await prisma.regra.update({ where: { id: existente.id }, data: { padrao: true } });
  }
}

async function main() {
  await garantirRegraPadrao();

  let cpfBase = 500000001;
  let cnpjBase = 600000000001;
  let telefoneSeq = 1;
  let nomeIndex = 0;
  let totalFuncionarios = 0;
  let totalPostos = 0;

  for (let e = 0; e < NOMES_EMPRESA.length; e++) {
    const cnpj = cnpjValido(String(cnpjBase++).padStart(12, '0'));

    const empresa = await prisma.empresa.upsert({
      where: { cnpj },
      update: {},
      create: {
        nome: NOMES_EMPRESA[e],
        cnpj,
        contato: `(42) 3${String(200 + e).padStart(3, '0')}-0000`,
      },
    });

    const cidade = CIDADES[e % CIDADES.length];

    for (const direcao of DIRECOES) {
      const nomePosto = `Loja ${direcao}`;

      let posto = await prisma.postoTrabalho.findFirst({
        where: { nome: nomePosto, empresaId: empresa.id },
      });
      if (!posto) {
        posto = await prisma.postoTrabalho.create({
          data: { nome: nomePosto, localizacao: `${cidade} — ${direcao}`, empresaId: empresa.id },
        });
      }
      totalPostos++;

      const turnos: { id: number }[] = [];
      for (const t of TURNOS_DO_POSTO) {
        let turno = await prisma.turno.findFirst({
          where: { descricao: t.descricao, postoId: posto.id },
        });
        if (!turno) {
          turno = await prisma.turno.create({
            data: {
              descricao: t.descricao,
              horaInicio: hora(t.inicio),
              horaFim: hora(t.fim),
              postoId: posto.id,
            },
          });
        }
        turnos.push(turno);

        for (let dia = 0; dia < 7; dia++) {
          await prisma.turnoDemanda.upsert({
            where: { turnoId_diaSemana: { turnoId: turno.id, diaSemana: dia } },
            update: { quantidade: t.demanda[dia] },
            create: { turnoId: turno.id, diaSemana: dia, quantidade: t.demanda[dia] },
          });
        }
      }

      // 3 titulares (um por turno; o do fechamento nunca trabalha
      // domingo, mesmo raciocínio do seed.ts) + 2 coringas habilitados
      // nos três turnos do posto.
      const equipe: { turnoPadraoId: number | null; habilitados: number[]; vetados: number[] }[] = [
        { turnoPadraoId: turnos[0].id, habilitados: [], vetados: [] },
        { turnoPadraoId: turnos[1].id, habilitados: [], vetados: [] },
        { turnoPadraoId: turnos[2].id, habilitados: [], vetados: [0] },
        { turnoPadraoId: null, habilitados: turnos.map((t) => t.id), vetados: [] },
        { turnoPadraoId: null, habilitados: turnos.map((t) => t.id), vetados: [] },
      ];

      for (const config of equipe) {
        const primeiro = PRIMEIROS[nomeIndex % PRIMEIROS.length];
        const sobrenome = SOBRENOMES[(nomeIndex * 7 + 3) % SOBRENOMES.length];
        const cpf = cpfValido(String(cpfBase++).padStart(9, '0'));

        const funcionario = await prisma.funcionario.upsert({
          where: { cpf },
          update: {
            nome: `${primeiro} ${sobrenome}`,
            turnoPadraoId: config.turnoPadraoId,
            postoId: posto.id,
            diasSemanaVetados: config.vetados,
          },
          create: {
            nome: `${primeiro} ${sobrenome}`,
            cpf,
            telefone: `(42) 99911-${String(telefoneSeq).padStart(4, '0')}`,
            cargo: CARGOS[nomeIndex % 2],
            cargaHorariaSemanal: 44,
            status: true,
            turnoPadraoId: config.turnoPadraoId,
            diasSemanaVetados: config.vetados,
            postoId: posto.id,
          },
        });

        for (const turnoId of config.habilitados) {
          await prisma.funcionarioTurno.upsert({
            where: { funcionarioId_turnoId: { funcionarioId: funcionario.id, turnoId } },
            update: {},
            create: { funcionarioId: funcionario.id, turnoId },
          });
        }

        nomeIndex++;
        telefoneSeq++;
        totalFuncionarios++;
      }
    }
  }

  console.log(`
✅ Massa de demonstração pronta.

   ${NOMES_EMPRESA.length} empresas, ${totalPostos} postos (5 por empresa), ${totalFuncionarios} funcionários
   (3 titulares + 2 coringas por posto, grade Abertura/Tarde/Fechamento
   com fechamento fechado no domingo — mesma estrutura do seed.ts).

   Pode rodar de novo sem duplicar (é tudo upsert).
`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
