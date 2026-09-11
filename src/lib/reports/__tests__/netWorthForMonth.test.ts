import { calculateNetWorthForMonth } from '../netWorthForMonth';

describe('calculateNetWorthForMonth', () => {
  it('reconstructs a cash account balance from initial + cumulative transactions', () => {
    const result = calculateNetWorthForMonth([
      {
        categoryKind: 'cash',
        initialBalance: 100_000,
        currentBalance: 999_999,
        cumulativeTransactionTotal: -30_000,
      },
    ]);
    // currentBalance is ignored for non-loan kinds; only initial + cumulative matter.
    expect(result).toBe(70_000);
  });

  it('reconstructs a credit account the same way (debt can go negative)', () => {
    const result = calculateNetWorthForMonth([
      {
        categoryKind: 'credit',
        initialBalance: 0,
        currentBalance: -999,
        cumulativeTransactionTotal: -50_00,
      },
    ]);
    expect(result).toBe(-50_00);
  });

  it('reconstructs a tracking account from its own transaction history', () => {
    const result = calculateNetWorthForMonth([
      {
        categoryKind: 'tracking',
        initialBalance: 1_000_00,
        currentBalance: 0,
        cumulativeTransactionTotal: 200_00,
      },
    ]);
    expect(result).toBe(1_200_00);
  });

  it('uses the CURRENT balance for a loan account, ignoring cumulativeTransactionTotal (known limitation)', () => {
    const result = calculateNetWorthForMonth([
      {
        categoryKind: 'loan',
        initialBalance: -100_000_00,
        currentBalance: -95_000_00,
        cumulativeTransactionTotal: -1_000_00,
      },
    ]);
    expect(result).toBe(-95_000_00);
  });

  it('sums a mix of account kinds correctly', () => {
    const result = calculateNetWorthForMonth([
      {
        categoryKind: 'cash',
        initialBalance: 500_00,
        currentBalance: 0,
        cumulativeTransactionTotal: 0,
      },
      {
        categoryKind: 'credit',
        initialBalance: 0,
        currentBalance: 0,
        cumulativeTransactionTotal: -200_00,
      },
      {
        categoryKind: 'loan',
        initialBalance: -50_000_00,
        currentBalance: -49_000_00,
        cumulativeTransactionTotal: 0,
      },
      {
        categoryKind: 'tracking',
        initialBalance: 2_000_00,
        currentBalance: 0,
        cumulativeTransactionTotal: 100_00,
      },
    ]);
    // 500_00 + (-200_00) + (-49_000_00) + (2_100_00)
    expect(result).toBe(-46_600_00);
  });

  it('returns 0 for no accounts', () => {
    expect(calculateNetWorthForMonth([])).toBe(0);
  });
});
