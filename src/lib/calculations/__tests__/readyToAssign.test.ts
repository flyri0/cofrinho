import { calculateReadyToAssign } from '../readyToAssign';

describe('calculateReadyToAssign', () => {
  it('subtracts total assigned from total income for the normal case', () => {
    expect(calculateReadyToAssign({ totalIncome: 500_000, totalAssigned: 300_000 })).toBe(200_000);
  });

  it('returns 0 when there is no history yet (no income, nothing assigned)', () => {
    expect(calculateReadyToAssign({ totalIncome: 0, totalAssigned: 0 })).toBe(0);
  });

  it('goes negative when more has been assigned than received', () => {
    expect(calculateReadyToAssign({ totalIncome: 100_000, totalAssigned: 150_000 })).toBe(-50_000);
  });

  it("is exactly 0 when the budget balances perfectly (the method's goal state)", () => {
    expect(calculateReadyToAssign({ totalIncome: 250_000, totalAssigned: 250_000 })).toBe(0);
  });
});
