// ============================================================
// planejador.spec.ts — a suíte do motor de escala.
//
// Nenhum teste toca o banco: é a razão de o domínio ser puro. Roda em
// milissegundos, então pode ser rodado a cada salvamento.
//
// O critério que vale mais que todos os outros: NENHUM teste confere o
// resultado com a mesma função que o produziu. Quem julga o plano é o
// `auditar`, que remonta o estado do zero e reexamina cada alocação com
// ela mesma removida. É assim que erro de bookkeeping aparece — estado
// que não foi desfeito, contador que ficou para trás — que é
// exatamente a classe de bug que o reparo por troca poderia introduzir.
//
// Os dois quadros de horário são os REAIS dos PDFs do cliente (Matriz e
// Uvaranas), porque foi neles que os defeitos da versão anterior
// apareceram.
// ============================================================
import { auditar } from './auditoria';
import {
  type Pessoa,
  type ProblemaEscala,
  type RegistroHistorico,
  type Turno,
} from './modelo';
import {
  type DemandaTurno,
  demandaUniforme,
  inicioDoHistorico,
  montarDias,
  montarVagas,
} from './periodo';
import { planejar } from './planejador';

// ------------------------------------------------------------
// Cenários
// ------------------------------------------------------------

const INTRAJORNADA = 1;
const turno = (id: number, nome: string, inicio: number, fim: number): Turno => ({
  id,
  nome,
  inicio,
  fim,
  duracaoEfetiva: Math.max(0, fim - inicio - INTRAJORNADA),
});

const MATRIZ = [
  turno(1, 'TITULAR 1', 7.75, 14),
  turno(2, 'TITULAR 2', 8, 14),
  turno(3, 'TITULAR 3', 14, 22),
  turno(4, 'TITULAR 4', 16, 22),
  turno(5, 'TITULAR 5', 18, 22),
];

const UVARANAS = [
  turno(1, 'TITULAR 1', 6, 14),
  turno(2, 'TITULAR 2', 8, 16),
  turno(3, 'TITULAR 3', 12, 20),
  turno(4, 'TITULAR 4', 16, 22),
  turno(5, 'TITULAR 5', 18, 23),
];

const pessoaVazia = {
  ausencias: new Set<string>(),
  nuncaNosDiasDaSemana: new Set<number>(),
};

function equipe(turnos: Turno[], coringas = 1): Pessoa[] {
  return [
    ...turnos.map((t, i) => ({
      id: i + 1,
      nome: t.nome,
      turnosHabilitados: [t.id],
      turnoPreferido: t.id,
      ...pessoaVazia,
      ausencias: new Set<string>(),
      nuncaNosDiasDaSemana: new Set<number>(),
    })),
    ...Array.from({ length: coringas }, (_, i) => ({
      id: 100 + i,
      nome: `CORINGA ${i + 1}`,
      turnosHabilitados: turnos.map((t) => t.id),
      turnoPreferido: null,
      ausencias: new Set<string>(),
      nuncaNosDiasDaSemana: new Set<number>(),
    })),
  ];
}

function cenario(opcoes: {
  turnos: Turno[];
  pessoas: Pessoa[];
  inicio: string;
  fim: string;
  trabalho?: number;
  descanso?: number;
  demandas?: DemandaTurno[];
  historico?: RegistroHistorico[];
  permitirForaDoPreferido?: boolean;
}): ProblemaEscala {
  const trabalho = opcoes.trabalho ?? 5;
  const descanso = opcoes.descanso ?? 1;
  const dias = montarDias(opcoes.inicio, opcoes.fim);
  return {
    dias,
    vagas: montarVagas(
      dias,
      opcoes.demandas ?? opcoes.turnos.map((t) => demandaUniforme(t.id)),
    ),
    pessoas: opcoes.pessoas,
    turnos: opcoes.turnos,
    limites: {
      cicloTrabalho: trabalho,
      cicloDescanso: descanso,
      maxConsecutivos: Math.min(trabalho, 6),
      horasSemana: 44,
      interjornada: 11,
      permitirForaDoPreferido: opcoes.permitirForaDoPreferido ?? false,
    },
    historico: opcoes.historico ?? [],
  };
}

const MESES_2026: [string, string][] = [
  ['2026-03-01', '2026-03-31'],
  ['2026-04-01', '2026-04-30'],
  ['2026-05-01', '2026-05-31'],
  ['2026-06-01', '2026-06-30'],
  ['2026-07-01', '2026-07-31'],
  ['2026-08-01', '2026-08-31'],
];

// ------------------------------------------------------------

describe('planejador — quadros reais do cliente', () => {
  for (const [rotulo, turnos] of [
    ['Matriz', MATRIZ],
    ['Uvaranas', UVARANAS],
  ] as const) {
    for (const [trabalho, descanso] of [
      [5, 1],
      [6, 1],
    ]) {
      describe(`${rotulo} ${trabalho}x${descanso}`, () => {
        it.each(MESES_2026)('não viola nenhuma regra em %s', (inicio, fim) => {
          const problema = cenario({
            turnos,
            pessoas: equipe(turnos),
            inicio,
            fim,
            trabalho,
            descanso,
          });
          const plano = planejar(problema);
          expect(auditar(problema, plano.atribuicoes)).toEqual([]);
        });

        it.each(MESES_2026)('cobre todas as vagas em %s', (inicio, fim) => {
          const problema = cenario({
            turnos,
            pessoas: equipe(turnos),
            inicio,
            fim,
            trabalho,
            descanso,
          });
          const plano = planejar(problema);
          // Cinco turnos, cinco titulares e um coringa: a demanda fecha.
          // A versão anterior deixava de 5 a 33 folgas descobertas aqui.
          expect(plano.vagasVazias).toEqual([]);
          expect(plano.atribuicoes).toHaveLength(problema.vagas.length);
        });

        it.each(MESES_2026)('nunca põe duas pessoas de folga no mesmo dia em %s', (inicio, fim) => {
          const problema = cenario({
            turnos,
            pessoas: equipe(turnos),
            inicio,
            fim,
            trabalho,
            descanso,
          });
          const plano = planejar(problema);
          const porDia = new Map<string, number>();
          for (const folga of plano.folgas) {
            if (folga.motivo === 'feriado-master') continue;
            porDia.set(folga.diaIso, (porDia.get(folga.diaIso) ?? 0) + 1);
          }
          // Não é regra programada: com 5 vagas e 6 pessoas, sobra
          // exatamente uma por dia. É aritmética da demanda.
          expect(Math.max(...porDia.values())).toBe(1);
        });
      });
    }
  }
});

describe('planejador — determinismo', () => {
  it('a mesma equipe cadastrada em outra ordem dá exatamente a mesma escala', () => {
    const direta = planejar(
      cenario({
        turnos: MATRIZ,
        pessoas: equipe(MATRIZ),
        inicio: '2026-03-01',
        fim: '2026-03-31',
      }),
    );
    const invertida = planejar(
      cenario({
        turnos: MATRIZ,
        pessoas: [...equipe(MATRIZ)].reverse(),
        inicio: '2026-03-01',
        fim: '2026-03-31',
      }),
    );
    expect(invertida.atribuicoes).toEqual(direta.atribuicoes);
  });

  it('rodar duas vezes o mesmo problema dá o mesmo resultado', () => {
    const montar = () =>
      cenario({
        turnos: UVARANAS,
        pessoas: equipe(UVARANAS),
        inicio: '2026-07-01',
        fim: '2026-07-31',
      });
    expect(planejar(montar()).atribuicoes).toEqual(planejar(montar()).atribuicoes);
  });
});

describe('planejador — continuidade na virada do mês', () => {
  // Este é o defeito silencioso da versão anterior: o cálculo de
  // espaçamento olhava só os dias do período, então quem vinha
  // trabalhando desde o fim do mês anterior começava o mês novo com o
  // contador zerado — enquanto o RN06 no banco enxergava o histórico.
  const marco = cenario({
    turnos: MATRIZ,
    pessoas: equipe(MATRIZ),
    inicio: '2026-03-01',
    fim: '2026-03-31',
  });
  const planoMarco = planejar(marco);
  const historico: RegistroHistorico[] = planoMarco.atribuicoes
    .filter((a) => a.diaIso >= inicioDoHistorico('2026-04-01'))
    .map((a) => ({ pessoaId: a.pessoaId, diaIso: a.diaIso, turnoId: a.turnoId }));

  const doisMeses = cenario({
    turnos: MATRIZ,
    pessoas: equipe(MATRIZ),
    inicio: '2026-03-01',
    fim: '2026-04-30',
  });

  it('com histórico, março emendado em abril não viola nada', () => {
    const abril = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-04-01',
      fim: '2026-04-30',
      historico,
    });
    const plano = planejar(abril);
    expect(
      auditar(doisMeses, [...planoMarco.atribuicoes, ...plano.atribuicoes]),
    ).toEqual([]);
  });

  it('sem histórico, a emenda estoura o limite de dias seguidos', () => {
    // Guarda de regressão: se um dia alguém "simplificar" o histórico
    // pra fora do problema, este teste cai.
    const abril = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-04-01',
      fim: '2026-04-30',
    });
    const plano = planejar(abril);
    const violacoes = auditar(doisMeses, [
      ...planoMarco.atribuicoes,
      ...plano.atribuicoes,
    ]);
    expect(violacoes.length).toBeGreaterThan(0);
    expect(violacoes.map((v) => v.regra)).toContain('RN06');
  });
});

describe('planejador — feriado master', () => {
  it('fecha o posto e dá folga a todo mundo na Páscoa', () => {
    // Páscoa de 2026: domingo, 05/04.
    const problema = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-04-01',
      fim: '2026-04-30',
    });
    expect(problema.vagas.some((v) => v.diaIso === '2026-04-05')).toBe(false);

    const plano = planejar(problema);
    expect(plano.atribuicoes.some((a) => a.diaIso === '2026-04-05')).toBe(false);
    const folgasDaPascoa = plano.folgas.filter((f) => f.diaIso === '2026-04-05');
    expect(folgasDaPascoa).toHaveLength(problema.pessoas.length);
    expect(folgasDaPascoa.every((f) => f.motivo === 'feriado-master')).toBe(true);
  });

  it('não avisa "sem domingo" quando o feriado em domingo já deu folga a todos', () => {
    // Aviso falso real da versão anterior em abril/2026.
    const plano = planejar(
      cenario({
        turnos: MATRIZ,
        pessoas: equipe(MATRIZ),
        inicio: '2026-04-01',
        fim: '2026-04-30',
      }),
    );
    expect(plano.diagnosticos.map((d) => d.codigo)).not.toContain('sem-domingo-de-folga');
  });
});

describe('planejador — demanda por dia da semana', () => {
  // A peça que o modelo anterior não sabia representar. Reduzir a
  // demanda de domingo é o que faz mais gente ganhar domingo de folga —
  // sem nenhuma regra nova, porque folga é o resíduo da demanda.
  const soAberturaEFechamentoNoDomingo: DemandaTurno[] = MATRIZ.map((t, i) => ({
    turnoId: t.id,
    porDiaDaSemana: [i === 0 || i === 4 ? 1 : 0, 1, 1, 1, 1, 1, 1],
  }));

  const quantosTemDomingoDeFolga = (problema: ProblemaEscala) => {
    const plano = planejar(problema);
    const domingos = problema.dias.filter((d) => d.diaDaSemana === 0).map((d) => d.iso);
    return problema.pessoas.filter((p) =>
      domingos.some(
        (d) => !plano.atribuicoes.some((a) => a.pessoaId === p.id && a.diaIso === d),
      ),
    ).length;
  };

  it('com demanda cheia, quem folga no domingo é limitado pelo número de domingos', () => {
    const problema = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-06-01',
      fim: '2026-06-30',
    });
    // Junho/2026 tem 4 domingos e o posto tem 6 pessoas: 2 ficam sem.
    // Não é falha do algoritmo, é aritmética — e o diagnóstico diz isso.
    expect(quantosTemDomingoDeFolga(problema)).toBe(4);
    const diagnostico = planejar(problema).diagnosticos.find(
      (d) => d.codigo === 'sem-domingo-de-folga',
    );
    expect(diagnostico).toBeDefined();
    expect(diagnostico!.dados).toMatchObject({ domingosNoPeriodo: 4, pessoasNoPosto: 6 });
  });

  it('reduzindo a demanda de domingo, mais gente ganha domingo de folga — mas não todo mundo', () => {
    const problema = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-06-01',
      fim: '2026-06-30',
      demandas: soAberturaEFechamentoNoDomingo,
    });
    // Sobe de 4 para 5, que é o efeito que este teste existe pra fixar.
    //
    // Não chega a 6 de propósito, e vale entender por quê: no domingo
    // só abrem dois turnos, e o da abertura só tem duas pessoas
    // habilitadas — o titular dele e o coringa. Para o titular folgar
    // num domingo, o coringa tem que cobri-lo, e aí o coringa deixa de
    // cobrir outra coisa. O planejador prefere cobrir três vagas a dar
    // um domingo a mais, porque vaga vazia é buraco no posto e domingo
    // é conforto.
    //
    // Este teste já exigiu 6, e passava: o motor de então não tinha o
    // termo de RITMO, e o desempate caía por acaso do lado do domingo,
    // ao custo de cinco vagas vazias em vez de duas. A conta do
    // planejador mudou de propósito; esta expectativa acompanha, com o
    // contrapeso medido logo abaixo para a troca não passar batida.
    expect(quantosTemDomingoDeFolga(problema)).toBe(5);

    // O contrapeso: a troca só se justifica porque cobre mais. Se um
    // dia o número de vagas vazias subir aqui, a decisão deixou de
    // valer a pena e este teste tem que cair.
    expect(planejar(problema).vagasVazias.length).toBeLessThanOrEqual(2);
  });
});

describe('planejador — restrições de cadastro', () => {
  it('respeita "nunca trabalha domingo"', () => {
    const pessoas = equipe(MATRIZ);
    pessoas[4].nuncaNosDiasDaSemana = new Set([0]); // TITULAR 5
    const problema = cenario({
      turnos: MATRIZ,
      pessoas,
      inicio: '2026-03-01',
      fim: '2026-03-31',
    });
    const plano = planejar(problema);
    const domingos = problema.dias.filter((d) => d.diaDaSemana === 0).map((d) => d.iso);
    expect(
      plano.atribuicoes.filter(
        (a) => a.pessoaId === pessoas[4].id && domingos.includes(a.diaIso),
      ),
    ).toEqual([]);
  });

  it('respeita ausência registrada', () => {
    const pessoas = equipe(MATRIZ);
    pessoas[2].ausencias = new Set(['2026-03-10', '2026-03-11', '2026-03-12']);
    const plano = planejar(
      cenario({ turnos: MATRIZ, pessoas, inicio: '2026-03-01', fim: '2026-03-31' }),
    );
    expect(
      plano.atribuicoes.filter(
        (a) => a.pessoaId === pessoas[2].id && a.diaIso.startsWith('2026-03-1'),
      ).length,
    ).toBeGreaterThan(0); // trabalhou noutros dias da dezena
    for (const dia of ['2026-03-10', '2026-03-11', '2026-03-12']) {
      expect(
        plano.atribuicoes.some((a) => a.pessoaId === pessoas[2].id && a.diaIso === dia),
      ).toBe(false);
      expect(
        plano.folgas.find((f) => f.pessoaId === pessoas[2].id && f.diaIso === dia)?.motivo,
      ).toBe('ausencia');
    }
  });

  it('acusa turno sem ninguém habilitado como erro de cadastro', () => {
    const pessoas = equipe(MATRIZ).filter((p) => p.turnoPreferido !== 3);
    const plano = planejar(
      cenario({ turnos: MATRIZ, pessoas, inicio: '2026-03-01', fim: '2026-03-31' }),
    );
    // O coringa continua habilitado no turno 3, então não é erro de
    // cadastro — é falta de gente. Remover o coringa também:
    const semCoringa = pessoas.filter((p) => p.turnoPreferido !== null);
    const plano2 = planejar(
      cenario({
        turnos: MATRIZ,
        pessoas: semCoringa,
        inicio: '2026-03-01',
        fim: '2026-03-31',
      }),
    );
    expect(plano.diagnosticos.map((d) => d.codigo)).not.toContain(
      'turno-sem-ninguem-habilitado',
    );
    const erro = plano2.diagnosticos.find(
      (d) => d.codigo === 'turno-sem-ninguem-habilitado',
    );
    expect(erro).toBeDefined();
    expect(erro!.nivel).toBe('erro');
    expect(plano2.vagasVazias.every((v) => v.turnoId !== 3 || v.razao === 'ninguem-habilitado')).toBe(true);
  });
});

describe('planejador — interjornada nos dois sentidos', () => {
  it('não encadeia dois turnos que deixam menos que o mínimo entre eles', () => {
    // Fecha 22:00 e abre 07:45 no dia seguinte: 9h45, abaixo das 11h.
    // A versão anterior escolhia a ORDEM do rodízio pra evitar isso; aqui
    // é restrição dura, então nem a ordem precisa ser escolhida.
    const plano = planejar(
      cenario({
        turnos: MATRIZ,
        pessoas: equipe(MATRIZ),
        inicio: '2026-03-01',
        fim: '2026-03-31',
      }),
    );
    const porPessoaDia = new Map(
      plano.atribuicoes.map((a) => [`${a.pessoaId}|${a.diaIso}`, a.turnoId]),
    );
    const porId = new Map(MATRIZ.map((t) => [t.id, t]));
    for (const a of plano.atribuicoes) {
      const amanha = new Date(Date.parse(`${a.diaIso}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10);
      const seguinte = porPessoaDia.get(`${a.pessoaId}|${amanha}`);
      if (seguinte === undefined) continue;
      const intervalo = 24 - porId.get(a.turnoId)!.fim + porId.get(seguinte)!.inicio;
      expect(intervalo).toBeGreaterThanOrEqual(11);
    }
  });
});

describe('auditar', () => {
  it('pega uma violação injetada à mão', () => {
    const problema = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-03-01',
      fim: '2026-03-31',
    });
    const plano = planejar(problema);
    expect(auditar(problema, plano.atribuicoes)).toEqual([]);

    // Tira a folga de alguém: põe o titular do turno 1 pra trabalhar
    // TODOS os dias do mês. Tem que estourar RN06/RN07.
    const semFolga = [
      ...plano.atribuicoes.filter((a) => a.turnoId !== 1),
      ...problema.dias
        .filter((d) => !d.ehFeriadoMaster)
        .map((d) => ({
          diaIso: d.iso,
          turnoId: 1,
          indice: 0,
          pessoaId: 1,
          foraDoPreferido: false,
        })),
    ];
    const violacoes = auditar(problema, semFolga);
    expect(violacoes.length).toBeGreaterThan(0);
    expect(violacoes.every((v) => v.pessoaId === 1)).toBe(true);
    expect(violacoes.map((v) => v.regra)).toContain('RN07');
  });

  it('não trata "fora do turno de casa" como irregularidade trabalhista', () => {
    // Edição manual do gestor: ele pode remanejar horário. Só regra
    // trabalhista conta como violação.
    const problema = cenario({
      turnos: MATRIZ,
      pessoas: equipe(MATRIZ),
      inicio: '2026-03-01',
      fim: '2026-03-02',
    });
    const remanejada = [
      { diaIso: '2026-03-02', turnoId: 3, indice: 0, pessoaId: 1, foraDoPreferido: true },
    ];
    expect(auditar(problema, remanejada)).toEqual([]);
    expect(auditar(problema, remanejada, { incluirQualificacao: true })).toHaveLength(1);
  });
});

describe('planejador — varredura sintética', () => {
  it('não viola nenhuma regra em 336 configurações', () => {
    const ciclos: [number, number][] = [
      [5, 1],
      [6, 1],
      [4, 1],
      [5, 2],
    ];
    let cenarios = 0;
    const violacoes: unknown[] = [];

    for (let n = 2; n <= 8; n++) {
      const turnos = Array.from({ length: n }, (_, i) =>
        turno(i + 1, `T${i + 1}`, 6 + i * 2, 6 + i * 2 + 6),
      );
      for (const [trabalho, descanso] of ciclos) {
        const coringas = Math.ceil((n * descanso) / trabalho);
        for (let mes = 0; mes < 12; mes++) {
          const inicio = new Date(Date.UTC(2026, mes, 1)).toISOString().slice(0, 10);
          const fim = new Date(Date.UTC(2026, mes + 1, 0)).toISOString().slice(0, 10);
          const problema = cenario({
            turnos,
            pessoas: equipe(turnos, coringas),
            inicio,
            fim,
            trabalho,
            descanso,
          });
          const plano = planejar(problema);
          violacoes.push(...auditar(problema, plano.atribuicoes));
          cenarios++;
        }
      }
    }

    expect(cenarios).toBe(336);
    expect(violacoes).toEqual([]);
  });
});
