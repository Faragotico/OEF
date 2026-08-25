// ============================================================
// OEF — Seed: cenário realista (bairros reais de Ponta Grossa,
// mesmos postos/turnos do protótipo visual do TCC).
// Rodar com: npx prisma db seed
//
// Não cria escalas/alocações prontas de propósito — o fluxo real é
// abrir "Escalas" > "+ Gerar escala" pra cada posto na tela, agora
// que já existem funcionários com turno padrão (e coringa) prontos
// pra isso em todos os 4 postos.
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: o Prisma exige DateTime até para campos @db.Time
const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

// Gera um CPF com dígitos verificadores válidos (mesmo algoritmo do
// trigger fn_valida_cpf do banco: mod 11), a partir de uma base de 9
// dígitos. Evita ficar calculando dígito a dígito na mão pra cada
// funcionário novo.
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
  // Empresa cliente (a Sharon Pontes presta serviço terceirizado pra ela)
  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Tozetto & Cia Ltda',
      cnpj: '00000000000191',
      contato: '(42) 3222-0000',
    },
  });

  // Postos de trabalho — bairros reais de Ponta Grossa, mesmos nomes e
  // endereços usados no protótipo visual do TCC.
  const [mercadoCentro, uvaranas, jardimCarvalho, novaRussia] =
    await Promise.all([
      prisma.postoTrabalho.create({
        data: { nome: 'Mercado Centro', localizacao: 'Rua XV de Novembro, 1250', empresaId: empresa.id },
      }),
      prisma.postoTrabalho.create({
        data: { nome: 'Uvaranas', localizacao: 'Av. dos Pioneiros, 850', empresaId: empresa.id },
      }),
      prisma.postoTrabalho.create({
        data: { nome: 'Jardim Carvalho', localizacao: 'Rua Santos Dumont, 425', empresaId: empresa.id },
      }),
      prisma.postoTrabalho.create({
        data: { nome: 'Nova Rússia', localizacao: 'Av. Presidente Kennedy, 1580', empresaId: empresa.id },
      }),
    ]);

  // Turnos — dois grupos de horário (2 turnos cada), reaproveitados por
  // dois postos cada, igual ao padrão visto nas escalas reais e no
  // protótipo (cada posto sempre com um T1 e um T2).
  const [centroT1, centroT2, uvaranasT1, uvaranasT2] = await Promise.all([
    prisma.turno.create({ data: { descricao: 'Turno 1', horaInicio: hora('06:00'), horaFim: hora('14:00') } }),
    prisma.turno.create({ data: { descricao: 'Turno 2', horaInicio: hora('14:00'), horaFim: hora('22:00') } }),
    prisma.turno.create({ data: { descricao: 'Turno 1', horaInicio: hora('07:00'), horaFim: hora('15:00') } }),
    prisma.turno.create({ data: { descricao: 'Turno 2', horaInicio: hora('15:00'), horaFim: hora('23:00') } }),
  ]);

  // Mercado Centro e Jardim Carvalho usam o grupo 06-14/14-22.
  // Uvaranas e Nova Rússia usam o grupo 07-15/15-23.
  const postos = [
    { nome: 'Mercado Centro', t1: centroT1.id, t2: centroT2.id },
    { nome: 'Jardim Carvalho', t1: centroT1.id, t2: centroT2.id },
    { nome: 'Uvaranas', t1: uvaranasT1.id, t2: uvaranasT2.id },
    { nome: 'Nova Rússia', t1: uvaranasT1.id, t2: uvaranasT2.id },
  ];

  // 5 funcionários por posto (2 no turno 1, 1 no turno 2, 2 coringas sem
  // turno fixo — cobrem a folga de quem estiver de folga naquele dia,
  // igual ao "ALCIDES" da escala real UVARANAS_MARÇO_2025). DOIS
  // coringas, não um: com só um, ele às vezes fecha o Turno 2 (22h/23h)
  // um dia e precisaria abrir o Turno 1 (06h/07h) no dia seguinte pra
  // cobrir outra folga — menos de 11h de intervalo, RN05 barra. Com um
  // segundo coringa "de reserva", o motor já tenta o outro automaticamente
  // (ver GeracaoEscalaService: quando um coringa não passa na regra, o
  // próximo da lista tenta cobrir o mesmo dia).
  const nomes = [
    'Ana Beatriz Ferreira', 'Bruno Cardoso Lima', 'Carla Mendes Ribeiro', 'Diego Almeida Souza', 'Rafael Souza Prado',
    'Elaine Cristina Pires', 'Fábio Henrique Nunes', 'Giovana Rodrigues Melo', 'Hugo Vinícius Barros', 'Sabrina Lopes Cardoso',
    'Isabela Martins Cunha', 'João Vitor Teixeira', 'Karina Duarte Moreira', 'Lucas Gabriel Farias', 'Tiago Fernandes Rocha',
    'Mariana Torres Batista', 'Nelson Augusto Xavier', 'Otávio Ramos Correia', 'Patrícia Gomes Vieira', 'Vinícius Alves Barbosa',
  ];
  const cargos = ['Porteiro', 'Recepcionista'];

  let nomeIndex = 0;
  let telefoneSeq = 1;
  let cpfBase = 100000001;

  for (const posto of postos) {
    const funcionariosDoPosto = [
      { turnoPadraoId: posto.t1 },
      { turnoPadraoId: posto.t1 },
      { turnoPadraoId: posto.t2 },
      { coringa: true },
      { coringa: true },
    ];

    for (const config of funcionariosDoPosto) {
      const nome = nomes[nomeIndex];
      await prisma.funcionario.create({
        data: {
          nome,
          cpf: cpfValido(String(cpfBase).padStart(9, '0')),
          telefone: `(42) 99911-${String(telefoneSeq).padStart(4, '0')}`,
          cargo: cargos[nomeIndex % 2],
          cargaHorariaSemanal: 44,
          status: true,
          turnoPadraoId: config.turnoPadraoId,
          coringa: config.coringa ?? false,
        },
      });
      nomeIndex++;
      telefoneSeq++;
      cpfBase++;
    }
  }

  // Regras trabalhistas (as mesmas usadas pelo motor de geração — RN01-07)
  await prisma.regra.createMany({
    data: [
      { descricao: 'Escala 5x1: cinco dias trabalhados para um de folga', tipo: 'escala', valor: '5x1' },
      { descricao: 'Intervalo mínimo entre jornadas de 11 horas', tipo: 'intervalo_interjornada', valor: '11' },
      { descricao: 'Intervalo intrajornada mínimo de 1 hora para jornadas acima de 6 horas', tipo: 'intervalo_intrajornada', valor: '60' },
      { descricao: 'Carga horária semanal máxima de 44 horas', tipo: 'carga_horaria_semanal', valor: '44' },
      { descricao: 'Descanso semanal remunerado obrigatório (1 folga por semana)', tipo: 'descanso_semanal', valor: '1' },
    ],
  });

  // Ausência de exemplo (testa RN02 — funcionário ausente não pode ser alocado)
  const primeiroFuncionario = await prisma.funcionario.findFirst({
    orderBy: { id: 'asc' },
  });
  if (primeiroFuncionario) {
    await prisma.ausencia.create({
      data: {
        dataInic: new Date('2026-09-10'),
        dataFim: new Date('2026-09-10'),
        motivo: 'Consulta médica',
        compensacao: 'Adiantamento de folga',
        funcionarioId: primeiroFuncionario.id,
      },
    });
  }

  console.log('✅ Seed concluído: 4 postos (Mercado Centro, Uvaranas, Jardim Carvalho, Nova Rússia), 20 funcionários (12 com turno fixo + 8 coringas, 2 por posto), 5 regras, 1 ausência.');
  console.log('   Abra a tela "Escalas" > "+ Gerar escala" pra criar a primeira escala de cada posto.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
