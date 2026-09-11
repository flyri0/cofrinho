import {
  formatMonth,
  formatMonthLabel,
  formatMonthShort,
  getCurrentMonth,
  shiftMonth,
} from '../budgetMonth';

describe('formatMonth / getCurrentMonth', () => {
  it('zero-pads the month', () => {
    expect(formatMonth(2026, 5)).toBe('2026-05');
    expect(formatMonth(2026, 12)).toBe('2026-12');
  });

  it('derives the current month from a given Date', () => {
    expect(getCurrentMonth(new Date(2026, 0, 15))).toBe('2026-01'); // January (0-indexed in JS Date)
  });

  it('defaults to the real current date when none is given', () => {
    expect(getCurrentMonth()).toBe(getCurrentMonth(new Date()));
  });
});

describe('shiftMonth', () => {
  it('moves forward within the same year for the normal case', () => {
    expect(shiftMonth('2026-05', 1)).toBe('2026-06');
  });

  it('moves backward within the same year', () => {
    expect(shiftMonth('2026-05', -1)).toBe('2026-04');
  });

  it('rolls over into the next year (December -> January)', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('rolls back into the previous year (January -> December)', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('handles multi-year jumps (edge case)', () => {
    expect(shiftMonth('2026-01', -14)).toBe('2024-11');
  });
});

describe('formatMonthLabel', () => {
  it('formats a pt-BR label with the month capitalized', () => {
    expect(formatMonthLabel('2026-05', 'pt-BR')).toBe(
      new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
        .format(new Date(2026, 4, 1))
        .replace(/^./, (c) => c.toUpperCase()),
    );
  });

  it('formats an en label', () => {
    expect(formatMonthLabel('2026-05', 'en')).toBe('May 2026');
  });
});

describe('formatMonthShort', () => {
  it('formats an en short label', () => {
    expect(formatMonthShort('2026-05', 'en')).toBe('May');
  });

  it('formats a pt-BR short label', () => {
    expect(formatMonthShort('2026-05', 'pt-BR')).toBe(
      new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(2026, 4, 1)),
    );
  });
});
