// ============================================================
// Cenários de teste — monta dados que DISPARAM os avisos e bloqueios
// novos, para conferir na tela como ficaram:
//
//   1. "Acima da carga horária do contrato": Ana tem contrato de 20h e
//      o turno dela dá ~35h por semana.
//   2. "Também escalados em outro posto": Gustavo é volante (sem posto)
//      e entra nas escalas dos DOIS postos do cenário no mesmo mês.
//   3. Funcionário inativo: Helena é escalada e depois inativada ("saiu
//      no meio do mês"). Editar uma célula dela na grade tem que dar erro.
//   4. Ausência: Bruno tem férias de 15 a 19/12 (aparece como folga).
//
// Tudo fica na empresa "Cenários de Teste Ltda", separado dos outros
// dados. Rodar de novo APAGA o cenário anterior e monta do zero.
//
// As escalas são geradas pelo MESMO serviço da tela (GeracaoEscalaService),
// não inseridas à mão — então o resultado é o que o motor de verdade faz.
//
// Rodar (na pasta backend):  pnpm seed:cenarios
// ============================================================
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { GeracaoEscalaService } from '../src/domain/services/geracao-escala.service';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa o que já estiver no ambiente
}

const prisma = new PrismaClient();

const INICIO = '2026-12-01';
const FIM = '2026-12-31';

const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);

function cpfValido(baseNove: string): string {
  const nums = baseNove.split('').map(Number);
  const digito = (lista: number[], peso: number) => {
    const soma = lista.reduce((acc, n, i) => acc + n * (peso - i), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(nums, 10);
  const d2 = digito([...nums, d1], 11);
  return `${baseNove}${d1}${d2}`;
}

function cnpjValido(baseDoze: string): string {
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, ...pesos1];
  const digito = (nums: number[], pesos: number[]) => {
    const resto = nums.reduce((acc, n, i) => acc + n * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const nums = baseDoze.split('').map(Number);
  const d1 = digito(nums, pesos1);
  const d2 = digito([...nums, d1], pesos2);
  return `${baseDoze}${d1}${d2}`;
}

const CNPJ = cnpjValido('987650001000');
// CPFs fixos, para achar e apagar as mesmas pessoas a cada execução.
const CPF = {
  ana: cpfValido('900000001'),
  diego: cpfValido('900000002'),
  bruno: cpfValido('900000003'),
  carla: cpfValido('900000004'),
  helena: cpfValido('900000005'),
  elisa: cpfValido('900000006'),
  fabio: cpfValido('900000007'),
  gustavo: cpfValido('900000008'),
};

async function apagarCenarioAnterior() {
  const empresa = await prisma.empresa.findUnique({ where: { cnpj: CNPJ } });
  const funcionarios = await prisma.funcionario.findMany({
    where: { cpf: { in: Object.values(CPF) } },
    select: { id: true },
  });
  const idsFuncionarios = funcionarios.map((f) => f.id);
  const postos = empresa
    ? await prisma.postoTrabalho.findMany({ where: { empresaId: empresa.id }, select: { id: true } })
    : [];
  const idsPostos = postos.map((p) => p.id);

  // Ordem importa: alocação e ausência apontam para funcionário (NoAction).
  await prisma.alocacao.deleteMany({ where: { funcionarioId: { in: idsFuncionarios } } });
  await prisma.escala.deleteMany({ where: { postoId: { in: idsPostos } } });
  await prisma.ausencia.deleteMany({ where: { funcionarioId: { in: idsFuncionarios } } });
  await prisma.funcionario.deleteMany({ where: { id: { in: idsFuncionarios } } });
  await prisma.turno.deleteMany({ where: { postoId: { in: idsPostos } } });
  await prisma.postoTrabalho.deleteMany({ where: { id: { in: idsPostos } } });
  if (empresa) await prisma.empresa.delete({ where: { id: empresa.id } });
}

async function criarTurno(postoId: number, descricao: string, inicio: string, fim: string) {
  return prisma.turno.create({
    data: {
      postoId,
      descricao,
      horaInicio: hora(inicio),
      horaFim: hora(fim),
      // Uma pessoa por dia, todos os dias da semana.
      demandas: { create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, quantidade: 1 })) },
    },
  });
}

async function cargo(nome: string) {
  return (await prisma.cargo.upsert({ where: { nome }, update: {}, create: { nome } })).id;
}

async function main() {
  await apagarCenarioAnterior();

  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Cenários de Teste Ltda',
      cnpj: CNPJ,
      contato: '(42) 3222-9999',
      logradouro: 'Rua dos Testes, 100',
      cidade: 'Ponta Grossa',
    },
  });
  const portaria = await prisma.postoTrabalho.create({
    data: { nome: 'Cenário A — Portaria', localizacao: 'Rua dos Testes, 100', empresaId: empresa.id },
  });
  const recepcao = await prisma.postoTrabalho.create({
    data: { nome: 'Cenário B — Recepção', localizacao: 'Rua dos Testes, 200', empresaId: empresa.id },
  });

  // 8h de turno - 1h de intervalo = 7h efetivas por dia.
  const manha = await criarTurno(portaria.id, 'Manhã', '07:00', '15:00');
  const tarde = await criarTurno(portaria.id, 'Tarde', '15:00', '23:00');
  const comercial = await criarTurno(recepcao.id, 'Comercial', '08:00', '17:00');

  const porteiro = await cargo('Porteiro');
  const recepcionista = await cargo('Recepcionista');
  const volante = await cargo('Volante');

  const novo = (dados: {
    nome: string;
    cpf: string;
    carga?: number;
    postoId: number | null;
    turnoPadraoId: number | null;
    habilitados?: number[];
    cargoId: number;
  }) =>
    prisma.funcionario.create({
      data: {
        nome: dados.nome,
        cpf: dados.cpf,
        cargaHorariaSemanal: dados.carga ?? 44,
        status: true,
        postoId: dados.postoId,
        turnoPadraoId: dados.turnoPadraoId,
        cargoId: dados.cargoId,
        diasSemanaVetados: [],
        habilitacoes: { create: (dados.habilitados ?? []).map((turnoId) => ({ turnoId })) },
      },
    });

  // Posto A
  const ana = await novo({ nome: 'Ana Meio Período', cpf: CPF.ana, carga: 20, postoId: portaria.id, turnoPadraoId: manha.id, cargoId: porteiro });
  const diego = await novo({ nome: 'Diego Manhã', cpf: CPF.diego, postoId: portaria.id, turnoPadraoId: manha.id, cargoId: porteiro });
  const bruno = await novo({ nome: 'Bruno Tarde (férias 15-19/12)', cpf: CPF.bruno, postoId: portaria.id, turnoPadraoId: tarde.id, cargoId: porteiro });
  const carla = await novo({ nome: 'Carla Coringa', cpf: CPF.carla, postoId: portaria.id, turnoPadraoId: null, habilitados: [manha.id, tarde.id], cargoId: porteiro });
  const helena = await novo({ nome: 'Helena (inativada depois)', cpf: CPF.helena, postoId: portaria.id, turnoPadraoId: tarde.id, cargoId: porteiro });
  // Posto B
  const elisa = await novo({ nome: 'Elisa Recepção', cpf: CPF.elisa, postoId: recepcao.id, turnoPadraoId: comercial.id, cargoId: recepcionista });
  const fabio = await novo({ nome: 'Fábio Recepção', cpf: CPF.fabio, postoId: recepcao.id, turnoPadraoId: comercial.id, cargoId: recepcionista });
  // Sem posto: cobre os dois postos.
  const gustavo = await novo({ nome: 'Gustavo Volante (2 postos)', cpf: CPF.gustavo, postoId: null, turnoPadraoId: null, habilitados: [manha.id, tarde.id, comercial.id], cargoId: volante });

  // Banco novo (ex.: o embutido do app desktop) não tem regra de rodízio, e
  // a geração precisa de uma. Cria a 5x1 só se não houver nenhuma.
  if (!(await prisma.regra.findFirst({ where: { tipo: 'escala' } }))) {
    await prisma.regra.create({
      data: {
        descricao: 'Escala 5x1: cinco dias trabalhados para um de folga',
        tipo: 'escala',
        valor: '5x1',
        padrao: true,
      },
    });
  }

  await prisma.ausencia.create({
    data: { funcionarioId: bruno.id, dataInic: dia('2026-12-15'), dataFim: dia('2026-12-19'), motivo: 'Férias' },
  });

  // Gera as escalas com o serviço de verdade (o mesmo da tela "Gerar escala").
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const geracao = app.get(GeracaoEscalaService);

  const escalaA = await geracao.gerarAutomatica({
    postoId: portaria.id,
    dataInicio: INICIO,
    dataFim: FIM,
    funcionarioIds: [ana.id, diego.id, bruno.id, carla.id, helena.id, gustavo.id],
  });
  const escalaB = await geracao.gerarAutomatica({
    postoId: recepcao.id,
    dataInicio: INICIO,
    dataFim: FIM,
    funcionarioIds: [elisa.id, fabio.id, gustavo.id],
  });
  await app.close();

  // Helena "sai da empresa" depois de a escala estar pronta.
  await prisma.funcionario.update({ where: { id: helena.id }, data: { status: false } });

  const codigos = (r: { diagnosticos: { codigo: string }[] }) =>
    r.diagnosticos.map((d) => d.codigo).join(', ') || '(nenhum)';
  console.log('✅ Cenários prontos (empresa "Cenários de Teste Ltda", dezembro/2026):');
  console.log(`   Escala A #${escalaA.escala?.id} — avisos na geração: ${codigos(escalaA)}`);
  console.log(`   Escala B #${escalaB.escala?.id} — avisos na geração: ${codigos(escalaB)}`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
