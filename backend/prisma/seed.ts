// ============================================================
// OEF — Seed: cenário realista (bairros reais de Ponta Grossa,
// mesmos postos do protótipo visual do TCC).
// Rodar com: npx prisma db seed
//
// Não cria escalas prontas de propósito — o fluxo real é abrir
// "Escalas" > "+ Gerar escala" pra cada posto, e agora cada posto já
// tem a GRADE DE HORÁRIOS dele cadastrada (quais turnos abre e de
// quanta gente precisa em cada dia da semana), que é de onde a geração
// automática parte.
//
// Duas coisas mudaram em relação à seed anterior:
//
//   1. Cada posto tem os PRÓPRIOS turnos. Antes dois postos
//      compartilhavam a mesma linha de turno, o que deixou de fazer
//      sentido quando o turno passou a pertencer a um posto — a grade
//      de horários é do lugar, e dois lugares não compartilham grade.
//   2. O domingo abre com meia equipe. É o que as escalas reais fazem,
//      e é o que faz mais gente ganhar domingo de folga: como quem não
//      pega vaga no dia está de folga, reduzir a demanda de domingo é
//      a alavanca direta pra isso.
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: o Prisma exige DateTime até para campos @db.Time
const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

// [dom, seg, ter, qua, qui, sex, sáb]
const TODO_DIA = [1, 1, 1, 1, 1, 1, 1];
const FECHA_DOMINGO = [0, 1, 1, 1, 1, 1, 1];

// Gera um CPF com dígitos verificadores válidos (mesmo algoritmo do
// trigger fn_valida_cpf do banco: mod 11), a partir de uma base de 9
// dígitos.
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

  const definicaoDosPostos = [
    {
      nome: 'Mercado Centro',
      localizacao: 'Rua XV de Novembro, 1250',
      turnos: [
        { descricao: 'Abertura', inicio: '06:00', fim: '14:00', demanda: TODO_DIA },
        { descricao: 'Tarde', inicio: '12:00', fim: '20:00', demanda: TODO_DIA },
        { descricao: 'Fechamento', inicio: '15:00', fim: '22:00', demanda: FECHA_DOMINGO },
      ],
    },
    {
      nome: 'Uvaranas',
      localizacao: 'Av. dos Pioneiros, 850',
      turnos: [
        { descricao: 'Abertura', inicio: '07:00', fim: '15:00', demanda: TODO_DIA },
        { descricao: 'Tarde', inicio: '13:00', fim: '21:00', demanda: TODO_DIA },
        { descricao: 'Fechamento', inicio: '15:00', fim: '23:00', demanda: FECHA_DOMINGO },
      ],
    },
    {
      nome: 'Jardim Carvalho',
      localizacao: 'Rua Santos Dumont, 425',
      turnos: [
        { descricao: 'Abertura', inicio: '06:00', fim: '14:00', demanda: TODO_DIA },
        { descricao: 'Tarde', inicio: '12:00', fim: '20:00', demanda: TODO_DIA },
        { descricao: 'Fechamento', inicio: '15:00', fim: '22:00', demanda: FECHA_DOMINGO },
      ],
    },
    {
      nome: 'Nova Rússia',
      localizacao: 'Av. Presidente Kennedy, 1580',
      turnos: [
        { descricao: 'Abertura', inicio: '07:00', fim: '15:00', demanda: TODO_DIA },
        { descricao: 'Tarde', inicio: '13:00', fim: '21:00', demanda: TODO_DIA },
        { descricao: 'Fechamento', inicio: '15:00', fim: '23:00', demanda: FECHA_DOMINGO },
      ],
    },
  ];

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

  for (const definicao of definicaoDosPostos) {
    const posto = await prisma.postoTrabalho.create({
      data: {
        nome: definicao.nome,
        localizacao: definicao.localizacao,
        empresaId: empresa.id,
      },
    });

    // A grade de horários do posto. Cada turno já nasce com a demanda
    // de cada dia da semana — é ela que a geração automática preenche.
    // `Promise.all` em vez de um laço com push: além de criar os turnos
    // de uma vez, é o que dá ao array um tipo de verdade. Com
    // `noImplicitAny: false` neste tsconfig, um `const turnos = []`
    // nasce como `never[]`, e aí todo push e todo `.id` viram erro de
    // tipo. A ordem é preservada, o que importa porque a equipe abaixo
    // se refere aos turnos pela posição.
    const turnos = await Promise.all(
      definicao.turnos.map((t) =>
        prisma.turno.create({
          data: {
            descricao: t.descricao,
            horaInicio: hora(t.inicio),
            horaFim: hora(t.fim),
            postoId: posto.id,
            demandas: {
              create: t.demanda.map((quantidade, diaSemana) => ({ diaSemana, quantidade })),
            },
          },
        }),
      ),
    );

    // Três titulares (um por turno) e dois coringas. Dois, e não um:
    // com um só, quando ele fecha às 22h/23h num dia e a vaga do dia
    // seguinte é a abertura das 06h/07h, o RN05 barra e a vaga fica
    // vazia. O segundo coringa dá ao motor uma saída nessas viradas.
    const equipe: {
      turnoPadraoId: number | null;
      habilitados: number[];
      vetados: number[];
    }[] = [
      { turnoPadraoId: turnos[0].id, habilitados: [], vetados: [] },
      { turnoPadraoId: turnos[1].id, habilitados: [], vetados: [] },
      // O titular do fechamento nunca trabalha domingo — caso real
      // observado em quadros de posto de segurança, e o turno de
      // fechamento é justamente o que não abre no domingo.
      { turnoPadraoId: turnos[2].id, habilitados: [], vetados: [0] },
      { turnoPadraoId: null, habilitados: turnos.map((t) => t.id), vetados: [] },
      { turnoPadraoId: null, habilitados: turnos.map((t) => t.id), vetados: [] },
    ];

    for (const config of equipe) {
      await prisma.funcionario.create({
        data: {
          nome: nomes[nomeIndex],
          cpf: cpfValido(String(cpfBase).padStart(9, '0')),
          telefone: `(42) 99911-${String(telefoneSeq).padStart(4, '0')}`,
          cargo: cargos[nomeIndex % 2],
          cargaHorariaSemanal: 44,
          status: true,
          // Sem turno de casa + com habilitação = coringa. Não existe
          // mais um campo booleano separado dizendo a mesma coisa.
          turnoPadraoId: config.turnoPadraoId,
          diasSemanaVetados: config.vetados,
          habilitacoes: { create: config.habilitados.map((turnoId) => ({ turnoId })) },
          // Vínculo com o posto: é o que faz "Gerar escala" já vir com
          // a equipe certa do posto escolhido.
          postoId: posto.id,
        },
      });
      nomeIndex++;
      telefoneSeq++;
      cpfBase++;
    }
  }

  // Regras trabalhistas — os quatro tipos que o motor de
  // geração/validação (RN01-07) de fato lê. 'descanso_semanal' fica de
  // fora: o RN07 já garante o DSR fixo em 6 dias e não é configurável.
  await prisma.regra.createMany({
    data: [
      { descricao: 'Escala 5x1: cinco dias trabalhados para um de folga', tipo: 'escala', valor: '5x1' },
      { descricao: 'Escala 6x1: seis dias trabalhados para um de folga', tipo: 'escala', valor: '6x1' },
      { descricao: 'Intervalo mínimo entre jornadas de 11 horas', tipo: 'intervalo_interjornada', valor: '11' },
      { descricao: 'Carga horária semanal máxima de 44 horas', tipo: 'carga_horaria_semanal', valor: '44' },
      { descricao: 'Intervalo intrajornada de 1 hora dentro do turno', tipo: 'intervalo_intrajornada', valor: '1' },
    ],
  });

  // Ausência de exemplo (testa RN02 — funcionário ausente não é escalado)
  const primeiroFuncionario = await prisma.funcionario.findFirst({ orderBy: { id: 'asc' } });
  if (primeiroFuncionario) {
    await prisma.ausencia.create({
      data: {
        dataInic: new Date('2026-09-10'),
        dataFim: new Date('2026-09-12'),
        motivo: 'Consulta médica',
        compensacao: 'Adiantamento de folga',
        funcionarioId: primeiroFuncionario.id,
      },
    });
  }

  console.log(
    '✅ Seed concluído: 4 postos, cada um com 3 turnos (fechamento não abre no domingo) e 5 funcionários (3 titulares + 2 coringas), 5 regras, 1 ausência.',
  );
  console.log('   Abra "Escalas" > "+ Gerar escala", escolha o posto e clique em Simular.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
