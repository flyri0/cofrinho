import { formatCents } from '../formatCents';

describe('formatCents', () => {
  it('formats a normal positive amount in BRL/pt-BR', () => {
    expect(formatCents(15_000, 'BRL', 'pt-BR')).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(150),
    );
  });

  it('formats 0 cents', () => {
    expect(formatCents(0, 'BRL', 'pt-BR')).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0),
    );
  });

  it('formats a negative amount (debt)', () => {
    const result = formatCents(-5_000, 'BRL', 'pt-BR');
    expect(result).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-50),
    );
    expect(result.startsWith('-')).toBe(true);
  });

  it('respects the given locale ordering (en vs pt-BR)', () => {
    const en = formatCents(15_000, 'BRL', 'en');
    const ptBR = formatCents(15_000, 'BRL', 'pt-BR');
    expect(en).not.toBe(ptBR);
  });
});
