import { acimaDaCargaContratual, emOutraEscala, segundaDaSemana } from './conferencia';
import { montarDias } from './periodo';

// Avisos que não mudam a escala: carga do contrato e "em outra escala".

describe('segundaDaSemana', () => {
  it('volta para a segunda-feira (semana de seg a dom)', () => {
    expect(segundaDaSemana('2026-06-01')).toBe('2026-06-01'); // segunda
    expect(segundaDaSemana('2026-06-07')).toBe('2026-06-01'); // domingo
    expect(segundaDaSemana('2026-06-03')).toBe('2026-06-01'); // quarta
  });
});

describe('acimaDaCargaContratual', () => {
  const dias = montarDias('2026-06-01', '2026-06-14');
  const pessoa = { id: 1, nome: 'Ana', cargaSemanal: 30 };
  const turnoDe = (dia: string, horas: number) => ({ pessoaId: 1, diaIso: dia, horas });

  it('avisa a semana que passa da carga do contrato', () => {
    // 5 dias x 7h = 35h na semana de 01/06 > 30h; na semana de 08/06, 3 x 7h = 21h.
    const alocacoes = [
      ...['01', '02', '03', '04', '05'].map((d) => turnoDe(`2026-06-${d}`, 7)),
      ...['08', '09', '10'].map((d) => turnoDe(`2026-06-${d}`, 7)),
    ];
    expect(acimaDaCargaContratual(dias, [pessoa], alocacoes)).toEqual([
      { id: 1, nome: 'Ana', carga: 30, semanas: [{ inicio: '2026-06-01', horas: 35 }] },
    ]);
  });

  it('não avisa quem fica exatamente na carga (sem erro de arredondamento)', () => {
    // 30h em 9 turnos de 3,333…h: sem arredondar daria 30,0000001h.
    const alocacoes = Array.from({ length: 9 }, () => turnoDe('2026-06-02', 10 / 3));
    expect(acimaDaCargaContratual(dias, [pessoa], alocacoes)).toEqual([]);
  });

  it('soma a semana anterior ao período quando ela entra na mesma semana', () => {
    // Período começa numa quarta: segunda e terça vêm do histórico.
    const periodo = montarDias('2026-06-03', '2026-06-07');
    const alocacoes = ['01', '02', '03', '04', '05'].map((d) => turnoDe(`2026-06-${d}`, 7));
    expect(acimaDaCargaContratual(periodo, [pessoa], alocacoes)).toHaveLength(1);
  });

  it('ignora quem está sem carga cadastrada', () => {
    const semCarga = { id: 1, nome: 'Ana', cargaSemanal: 0 };
    expect(acimaDaCargaContratual(dias, [semCarga], [turnoDe('2026-06-01', 50)])).toEqual([]);
  });
});

describe('emOutraEscala', () => {
  const pessoas = [
    { id: 1, nome: 'Ana' },
    { id: 2, nome: 'Bruno' },
  ];

  it('lista as outras escalas e os dias que coincidem com esta', () => {
    const desta = new Set(['1|2026-06-01', '1|2026-06-02']);
    const outras = [
      { pessoaId: 1, diaIso: '2026-06-02', escalaId: 9, posto: 'Loja Centro' },
      { pessoaId: 1, diaIso: '2026-06-05', escalaId: 9, posto: 'Loja Centro' },
    ];
    expect(emOutraEscala(pessoas, desta, outras)).toEqual([
      {
        id: 1,
        nome: 'Ana',
        escalas: [{ escalaId: 9, posto: 'Loja Centro', dias: 2, mesmoDia: ['2026-06-02'] }],
      },
    ]);
  });

  it('não avisa quem só está nesta escala', () => {
    expect(emOutraEscala(pessoas, new Set(['2|2026-06-01']), [])).toEqual([]);
  });
});
