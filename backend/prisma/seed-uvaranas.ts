// ============================================================
// OEF — Seed ISOLADA: só o posto Uvaranas, no padrão real que o
// cliente passou — 5 titulares, cada um com o PRÓPRIO horário
// (não 2 turnos compartilhados), e 1 coringa cobrindo a folga:
//
//   06:00–14:00 | 08:00–16:00 | 12:00–20:00 | 16:00–22:00 | 18:00–23:00
//
// A ordem de cadastro (crescente pelo horário de início) importa: o
// rodízio de folga desloca 1 posição por titular na ordem em que eles
// são criados, e nessa ordem a folga passa de titular em titular do
// horário mais tarde pro mais cedo dia a dia — isso garante pelo menos
// ~12h entre o fim do turno que o coringa cobriu ontem e o início do
// turno que ele cobre hoje (RN05, interjornada), então 1 coringa só dá
// conta sem ficar bloqueado.
//
// Existe separada da seed.ts principal só pra teste isolado: com
// SÓ Uvaranas no banco, a lista de funcionários do formulário "Gerar
// escala" não tem gente de outro posto pra marcar por engano.
//
// Rodar:
//   1) npx prisma migrate reset --skip-seed
//   2) npx ts-node prisma/seed-uvaranas.ts
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

function cpfValido(baseNove: string): string {
  const nums = baseNove.split('').map(Number);

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += nums[i] * (10 - i);
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;

  const nums10 = [...nums, d1];
  soma = 0;
  for (let i = 0; i < 10; i++) soma += nums10[i] * (11 - i);
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;

  return `${baseNove}${d1}${d2}`;
}

async function main() {
  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Tozetto & Cia Ltda',
      cnpj: '00000000000191',
      contato: '(42) 3222-0000',
    },
  });

  const uvaranas = await prisma.postoTrabalho.create({
    data: {
      nome: 'Uvaranas',
      localizacao: 'Av. dos Pioneiros, 850',
      empresaId: empresa.id,
    },
  });

  // 5 turnos distintos, um por titular — NÃO são 2 turnos
  // compartilhados. Ordem importa (ver comentário no topo do arquivo):
  // crescente pelo horário de início.
  const horarios = [
    { descricao: 'Abertura 1', inicio: '06:00', fim: '14:00' },
    { descricao: 'Abertura 2', inicio: '08:00', fim: '16:00' },
    { descricao: 'Meio', inicio: '12:00', fim: '20:00' },
    { descricao: 'Fechamento 1', inicio: '16:00', fim: '22:00' },
    { descricao: 'Fechamento 2', inicio: '18:00', fim: '23:00' },
  ];

  const turnos = await Promise.all(
    horarios.map((h) =>
      prisma.turno.create({
        data: { descricao: h.descricao, horaInicio: hora(h.inicio), horaFim: hora(h.fim) },
      }),
    ),
  );

  const nomesTitulares = [
    'Isabela Martins Cunha',
    'João Vitor Teixeira',
    'Karina Duarte Moreira',
    'Mariana Torres Batista',
    'Nelson Augusto Xavier',
  ];
  const cargos = ['Porteiro', 'Recepcionista'];

  let cpfBase = 100000001;
  let telefoneSeq = 1;

  for (let i = 0; i < nomesTitulares.length; i++) {
    await prisma.funcionario.create({
      data: {
        nome: nomesTitulares[i],
        cpf: cpfValido(String(cpfBase).padStart(9, '0')),
        telefone: `(42) 99911-${String(telefoneSeq).padStart(4, '0')}`,
        cargo: cargos[i % 2],
        cargaHorariaSemanal: 44,
        status: true,
        turnoPadraoId: turnos[i].id,
        coringa: false,
      },
    });
    cpfBase++;
    telefoneSeq++;
  }

  // 1 coringa só — sem turno fixo, cobre quem estiver de folga no dia.
  await prisma.funcionario.create({
    data: {
      nome: 'Otávio Ramos Correia',
      cpf: cpfValido(String(cpfBase).padStart(9, '0')),
      telefone: `(42) 99911-${String(telefoneSeq).padStart(4, '0')}`,
      cargo: 'Porteiro',
      cargaHorariaSemanal: 44,
      status: true,
      turnoPadraoId: null,
      coringa: true,
    },
  });

  await prisma.regra.createMany({
    data: [
      { descricao: 'Escala 5x1: cinco dias trabalhados para um de folga', tipo: 'escala', valor: '5x1' },
      { descricao: 'Intervalo mínimo entre jornadas de 11 horas', tipo: 'intervalo_interjornada', valor: '11' },
      { descricao: 'Intervalo intrajornada mínimo de 1 hora para jornadas acima de 6 horas', tipo: 'intervalo_intrajornada', valor: '60' },
      { descricao: 'Carga horária semanal máxima de 44 horas', tipo: 'carga_horaria_semanal', valor: '44' },
      { descricao: 'Descanso semanal remunerado obrigatório (1 folga por semana)', tipo: 'descanso_semanal', valor: '1' },
    ],
  });

  console.log('✅ Seed Uvaranas concluída: 1 posto, 6 funcionários (5 titulares, cada um com horário próprio, + 1 coringa), 5 regras.');
  console.log(`   Posto id: ${uvaranas.id} — em "Gerar escala", marque os 5 titulares e o coringa.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
