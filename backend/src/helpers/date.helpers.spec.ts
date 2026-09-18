import {
  calcularPascoa,
  feriadosMasterDoPeriodo,
  formatDate,
  horaDecimal,
  parseEscalaCiclo,
  parseEscalaLimit,
  shiftDurationHours,
  startOfIsoWeek,
} from './date.helpers';

describe('feriados master', () => {
  // A Páscoa muda de data todo ano (entre 22/mar e 25/abr) e é sempre
  // domingo — é o único dos quatro feriados master que precisa de
  // cálculo. Os anos abaixo saíram do calendário oficial.
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('calcula a Páscoa de %i', (ano, esperado) => {
    expect(formatDate(calcularPascoa(ano))).toBe(esperado);
    expect(calcularPascoa(ano).getUTCDay()).toBe(0);
  });

  it('cobre os anos que o período atravessa', () => {
    const feriados = feriadosMasterDoPeriodo(
      new Date(Date.UTC(2025, 11, 20)),
      new Date(Date.UTC(2026, 0, 10)),
    );
    expect(feriados.has('2025-12-25')).toBe(true);
    expect(feriados.has('2026-01-01')).toBe(true);
  });
});

describe('regra de escala', () => {
  it('lê o ciclo no formato NxM', () => {
    expect(parseEscalaCiclo('5x1')).toEqual({ trabalho: 5, descanso: 1 });
    expect(parseEscalaCiclo('6x1')).toEqual({ trabalho: 6, descanso: 1 });
    expect(parseEscalaLimit('5x1')).toBe(5);
  });

  it('cai no padrão 5x1 quando o valor não tem formato de ciclo', () => {
    expect(parseEscalaCiclo('44')).toEqual({ trabalho: 5, descanso: 1 });
    expect(parseEscalaCiclo(null)).toEqual({ trabalho: 5, descanso: 1 });
    expect(parseEscalaLimit('44')).toBeUndefined();
  });
});

describe('horas', () => {
  const hora = (h: string) => new Date(`1970-01-01T${h}:00Z`);

  it('converte hora do banco em horas decimais', () => {
    expect(horaDecimal(hora('07:45'))).toBeCloseTo(7.75);
    expect(horaDecimal(hora('14:00'))).toBe(14);
  });

  it('mede a duração do turno', () => {
    expect(
      shiftDurationHours({ horaInicio: hora('07:45'), horaFim: hora('14:00') }),
    ).toBeCloseTo(6.25);
  });
});

describe('startOfIsoWeek', () => {
  it('volta pra segunda-feira, tratando domingo como fim da semana', () => {
    // 2026-03-01 é domingo: a semana ISO dele começa em 23/02.
    expect(formatDate(startOfIsoWeek(new Date(Date.UTC(2026, 2, 1))))).toBe(
      '2026-02-23',
    );
    // 2026-03-02 é segunda: começa nela mesma.
    expect(formatDate(startOfIsoWeek(new Date(Date.UTC(2026, 2, 2))))).toBe(
      '2026-03-02',
    );
  });
});
