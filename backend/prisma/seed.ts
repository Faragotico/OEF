// ============================================================
// OEF — Seed: popula o banco com os dados de exemplo do documento
// Rodar com: npx prisma db seed
// Obs: o documento tinha um bug — Fernanda com o mesmo CPF do
// Carlos. Corrigido aqui (CPF é @unique, o banco recusaria).
// ============================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: o Prisma exige DateTime até para campos @db.Time
const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

async function main() {
  // Empresa cliente
  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Tozetto & Cia Ltda',
      cnpj: '00000000000191',
      contato: '(42) 3222-0000',
    },
  });

  // Postos de trabalho
  const [portariaPrincipal, recepcao, portariaEstac] = await Promise.all([
    prisma.postoTrabalho.create({
      data: { nome: 'Portaria Principal', localizacao: 'Entrada A', empresaId: empresa.id },
    }),
    prisma.postoTrabalho.create({
      data: { nome: 'Recepção', localizacao: 'Hall central', empresaId: empresa.id },
    }),
    prisma.postoTrabalho.create({
      data: { nome: 'Portaria Estacionamento', localizacao: 'Subsolo', empresaId: empresa.id },
    }),
  ]);

  // Funcionários (do documento, com telefone — apontamento da banca)
  await prisma.funcionario.createMany({
    data: [
      { nome: 'Ana Paula Souza',     cpf: '52998224725', telefone: '(42) 99911-0001', cargo: 'Porteira',       cargaHorariaSemanal: 44, status: true },
      { nome: 'Carlos Eduardo Lima', cpf: '11144477735', telefone: '(42) 99911-0002', cargo: 'Porteiro',       cargaHorariaSemanal: 44, status: true },
      { nome: 'Fernanda Costa',      cpf: '86288366757', telefone: '(42) 99911-0003', cargo: 'Recepcionista',  cargaHorariaSemanal: 44, status: true },
      // Os CPFs destes dois vinham do documento como 47752979782 e
      // 15705198743, mas ambos REPROVAM no dígito verificador (RNDoc01).
      // Corrigidos aqui mantendo os 9 primeiros dígitos e recalculando
      // os dois últimos. O documento precisa da mesma correção.
      { nome: 'João Pedro Alves',    cpf: '47752979708', telefone: '(42) 99911-0004', cargo: 'Porteiro',       cargaHorariaSemanal: 44, status: true },
      { nome: 'Mariana Rocha',       cpf: '15705198701', telefone: '(42) 99911-0005', cargo: 'Recepcionista',  cargaHorariaSemanal: 44, status: false },
    ],
  });

  // Regras trabalhistas (do documento)
  const regra5x1 = await prisma.regra.create({
    data: { descricao: 'Escala 5x1: cinco dias trabalhados para um de folga', tipo: 'escala', valor: '5x1' },
  });
  await prisma.regra.createMany({
    data: [
      { descricao: 'Intervalo mínimo entre jornadas de 11 horas',                          tipo: 'intervalo_interjornada',  valor: '11' },
      { descricao: 'Intervalo intrajornada mínimo de 1 hora para jornadas acima de 6 horas', tipo: 'intervalo_intrajornada', valor: '60' },
      { descricao: 'Carga horária semanal máxima de 44 horas',                             tipo: 'carga_horaria_semanal',   valor: '44' },
      { descricao: 'Descanso semanal remunerado obrigatório (1 folga por semana)',         tipo: 'descanso_semanal',        valor: '1' },
    ],
  });

  // Turnos
  await prisma.turno.createMany({
    data: [
      { descricao: 'Manhã', horaInicio: hora('06:00'), horaFim: hora('14:00') },
      { descricao: 'Tarde', horaInicio: hora('14:00'), horaFim: hora('22:00') },
      { descricao: 'Noite', horaInicio: hora('22:00'), horaFim: hora('06:00') },
    ],
  });

  // Escalas de julho/2026 (uma por posto, regra 5x1)
  await prisma.escala.createMany({
    data: [
      { dataInic: new Date('2026-07-01'), dataFim: new Date('2026-07-31'), postoId: portariaPrincipal.id, regraId: regra5x1.id },
      { dataInic: new Date('2026-07-01'), dataFim: new Date('2026-07-31'), postoId: recepcao.id,          regraId: regra5x1.id },
      { dataInic: new Date('2026-07-01'), dataFim: new Date('2026-07-31'), postoId: portariaEstac.id,     regraId: regra5x1.id },
    ],
  });

  console.log('✅ Seed concluído! Abra o Prisma Studio para conferir: npx prisma studio');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
