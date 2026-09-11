import { calculateNetWorth } from '../netWorth';

describe('calculateNetWorth', () => {
  it('sums cash, tracking, and debt balances for the normal case', () => {
    const accounts = [
      { balance: 500_000 }, // checking
      { balance: 1_200_000 }, // investment (tracking)
      { balance: -300_000 }, // credit card debt, already negative
    ];

    expect(calculateNetWorth(accounts)).toBe(1_400_000);
  });

  it('returns 0 when there are no accounts yet', () => {
    expect(calculateNetWorth([])).toBe(0);
  });

  it('goes negative when debts outweigh assets', () => {
    const accounts = [
      { balance: 100_000 }, // checking
      { balance: -800_000 }, // mortgage, already negative
    ];

    expect(calculateNetWorth(accounts)).toBe(-700_000);
  });

  it('counts tracking-only accounts (no budget accounts) correctly', () => {
    const accounts = [{ balance: 2_000_000 }]; // a brokerage tracking account
    expect(calculateNetWorth(accounts)).toBe(2_000_000);
  });
});
