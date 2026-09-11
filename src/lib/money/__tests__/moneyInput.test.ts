import { digitsToCents } from '../moneyInput';

describe('digitsToCents', () => {
  it('treats typed digits directly as cents for the normal case', () => {
    expect(digitsToCents('15000')).toBe(15000); // R$150,00
  });

  it('returns 0 for an empty/untouched input (no prior history)', () => {
    expect(digitsToCents('')).toBe(0);
  });

  it('strips non-digit characters (e.g. a formatted display string)', () => {
    expect(digitsToCents('R$ 1.500,00')).toBe(150000);
  });

  it('collapses leading zeros', () => {
    expect(digitsToCents('00015')).toBe(15);
  });
});
