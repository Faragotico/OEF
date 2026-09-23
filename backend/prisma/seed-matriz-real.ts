// ============================================================
// Reconstrói o posto MATRIZ como ele é no quadro real de setembro/2026,
// para dar de gerar pela tela e comparar lado a lado com o PDF.
//
//   pnpm exec ts-node prisma/seed-matriz-real.ts
//
// Roda de novo sem duplicar: tudo é upsert por nome/CPF.
// Não mexe em nada que já existe fora deste posto.
//
// A PARTE QUE INTERESSA — o domingo.
//
// No quadro real, domingo não é "menos gente nos mesmos horários": são
// horários OUTROS (745–14, 8–12, 12–20), que não existem de segunda a
// sábado. Como a demanda do sistema é por dia da semana, dá para
// representar isso cadastrando os horários de domingo como turnos
// próprios, com demanda só no domingo, e dando habilitação neles aos
// titulares. É esse arranjo que este seed monta — e é justamente ele que
// o teste tem que julgar: funciona, ou fica esquisito na prática?
// ============================================================
import { PrismaClient } from '@prisma/client';

try {
  process.loadEnvFile();
} catch {
  /* sem .env: usa o ambiente */
}

const prisma = new PrismaClient();
const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

// CPF com dígito verificador válido a partir de uma base de 9 dígitos.
function cpfValido(base: string): string {
  const n = base.split('').map(Number);
  let s = 0;
  for (let i = 0; i < 9; i++) s += n[i] * (10 - i);
  let r = s % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  const dez = [...n, d1];
  s = 0;
  for (let i = 0; i < 10; i++) s += dez[i] * (11 - i);
  r = s % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  return base + d1 + d2;
}

// [dom, seg, ter, qua, qui, sex, sáb] — lido do próprio quadro
const TURNOS = [
  { nome: 'Abertura 07:45',      ini: '07:45', fim: '16:00', dem: [0, 1, 1, 1, 1, 1, 1] },
  { nome: 'Manhã 08:00',         ini: '08:00', fim: '14:00', dem: [0, 1, 1, 1, 1, 1, 1] },
  { nome: 'Tarde 14:00',         ini: '14:00', fim: '22:00', dem: [0, 2, 2, 2, 2, 2, 2] },
  { nome: 'Tarde 16:00',         ini: '16:00', fim: '22:00', dem: [0, 1, 1, 1, 1, 1, 1] },
  { nome: 'Noite 18:00',         ini: '18:00', fim: '22:00', dem: [0, 1, 1, 1, 1, 1, 1] },
  //                                              soma seg–sáb: 6 de serviço,
  //                                              contado direto do quadro real
  // Só domingo — o regime que o quadro real usa e que o sistema não
  // tinha como descrever de outro jeito. Soma: 4 de serviço.
  { nome: 'Domingo 07:45',       ini: '07:45', fim: '14:00', dem: [1, 0, 0, 0, 0, 0, 0] },
  { nome: 'Domingo 08:00',       ini: '08:00', fim: '12:00', dem: [2, 0, 0, 0, 0, 0, 0] },
  { nome: 'Domingo 12:00',       ini: '12:00', fim: '20:00', dem: [1, 0, 0, 0, 0, 0, 0] },
];

// A equipe do quadro. `domingo` é o turno que a pessoa cobre no domingo
// (vira habilitação); `vetados` usa 0 = domingo.
const EQUIPE = [
  { nome: 'Carlos',  padrao: 'Abertura 07:45', domingo: 'Domingo 07:45', vetados: [] as number[] },
  { nome: 'Marcos',   padrao: 'Manhã 08:00',    domingo: 'Domingo 08:00', vetados: [] },
  { nome: 'André',   padrao: 'Tarde 14:00',    domingo: 'Domingo 12:00', vetados: [] },
  { nome: 'Ricardo',     padrao: 'Tarde 14:00',    domingo: 'Domingo 08:00', vetados: [] },
  { nome: 'Fábio',     padrao: 'Tarde 16:00',    domingo: null,            vetados: [] },
  // No quadro, Vinícius nunca entra no domingo — é '-----' em todos eles.
  { nome: 'Vinícius',  padrao: 'Noite 18:00',    domingo: null,            vetados: [0] },
  // Renato T. é o coringa: sem horário de casa, habilitado em tudo.
  { nome: 'Renato T.',  padrao: null,             domingo: null,            vetados: [] },
];

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '11223344556613' },
    update: {},
    create: {
      nome: 'Rede Tozetto (quadro real)',
      cnpj: '11223344556613',
      contato: '(42) 3220-0000',
    },
  });

  let posto = await prisma.postoTrabalho.findFirst({
    where: { nome: 'MATRIZ (quadro real)', empresaId: empresa.id },
  });
  if (!posto) {
    posto = await prisma.postoTrabalho.create({
      data: {
        nome: 'MATRIZ (quadro real)',
        localizacao: 'Ponta Grossa',
        empresaId: empresa.id,
      },
    });
  }

  const turnoPorNome = new Map<string, number>();
  for (const t of TURNOS) {
    let turno = await prisma.turno.findFirst({
      where: { descricao: t.nome, postoId: posto.id },
    });
    if (!turno) {
      turno = await prisma.turno.create({
        data: {
          descricao: t.nome,
          horaInicio: hora(t.ini),
          horaFim: hora(t.fim),
          postoId: posto.id,
        },
      });
    }
    turnoPorNome.set(t.nome, turno.id);
    for (let dia = 0; dia < 7; dia++) {
      await prisma.turnoDemanda.upsert({
        where: { turnoId_diaSemana: { turnoId: turno.id, diaSemana: dia } },
        update: { quantidade: t.dem[dia] },
        create: { turnoId: turno.id, diaSemana: dia, quantidade: t.dem[dia] },
      });
    }
  }

  const todosOsTurnos = [...turnoPorNome.values()];
  let base = 880000001;

  for (const p of EQUIPE) {
    const cpf = cpfValido(String(base++).padStart(9, '0'));
    const padraoId = p.padrao ? turnoPorNome.get(p.padrao)! : null;

    const func = await prisma.funcionario.upsert({
      where: { cpf },
      update: {
        nome: p.nome,
        turnoPadraoId: padraoId,
        postoId: posto.id,
        diasSemanaVetados: p.vetados,
      },
      create: {
        nome: p.nome,
        cpf,
        cargo: 'Porteiro',
        cargaHorariaSemanal: 44,
        status: true,
        turnoPadraoId: padraoId,
        postoId: posto.id,
        diasSemanaVetados: p.vetados,
      },
    });

    // Habilitações: o coringa cobre tudo; o titular cobre só o turno de
    // domingo dele, que é o que permite o regime diferente do domingo.
    const habilitar = p.padrao === null
      ? todosOsTurnos
      : p.domingo
        ? [turnoPorNome.get(p.domingo)!]
        : [];

    for (const turnoId of habilitar) {
      await prisma.funcionarioTurno.upsert({
        where: { funcionarioId_turnoId: { funcionarioId: func.id, turnoId } },
        update: {},
        create: { funcionarioId: func.id, turnoId },
      });
    }
  }

  // O 5x1 precisa existir como padrão de rodízio.
  const regra = await prisma.regra.findFirst({ where: { tipo: 'escala', valor: '5x1' } });
  if (!regra) {
    await prisma.regra.create({
      data: {
        descricao: '5x1',
        tipo: 'escala',
        valor: '5x1',
        padrao: true,
      },
    });
  }

  console.log(`
✅ Posto "MATRIZ (quadro real)" pronto.

   ${TURNOS.length} turnos  (5 de segunda a sábado + 3 só de domingo)
   ${EQUIPE.length} funcionários  (6 titulares + 1 coringa)

   Agora, na tela:
     Escalas > Gerar escala
     posto: MATRIZ (quadro real)
     período: 01/09/2026 a 30/09/2026
     rodízio: 5x1

   Compare com o PDF "ESCALA MATRIZ SETEMBRO 2026". O que olhar:
     - o domingo saiu com os horários de domingo?
     - Vinícius ficou fora de todos os domingos?
     - a folga gira, uma por dia?
     - quantas vagas ficaram vazias, e o diagnóstico de cada uma?
`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
