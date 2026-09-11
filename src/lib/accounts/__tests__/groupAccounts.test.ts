import { groupAccountsByKind } from '../groupAccounts';

describe('groupAccountsByKind', () => {
  it('groups and subtotals accounts across all 4 kinds, in cash/credit/loan/tracking order', () => {
    const accounts = [
      { id: 1, categoryKind: 'tracking' as const, currentBalance: 1_000_00 },
      { id: 2, categoryKind: 'cash' as const, currentBalance: 50_00 },
      { id: 3, categoryKind: 'cash' as const, currentBalance: 25_00 },
      { id: 4, categoryKind: 'credit' as const, currentBalance: -30_00 },
    ];

    const groups = groupAccountsByKind(accounts);

    expect(groups.map((g) => g.kind)).toEqual(['cash', 'credit', 'tracking']);
    expect(groups[0]).toEqual({
      kind: 'cash',
      accounts: [accounts[1], accounts[2]],
      subtotal: 75_00,
    });
    expect(groups[1].subtotal).toBe(-30_00);
  });

  it('returns an empty array for no accounts (first run)', () => {
    expect(groupAccountsByKind([])).toEqual([]);
  });

  it('keeps a group with a negative subtotal (all-debt loan group)', () => {
    const accounts = [
      { id: 1, categoryKind: 'loan' as const, currentBalance: -500_00 },
      { id: 2, categoryKind: 'loan' as const, currentBalance: -200_00 },
    ];

    const groups = groupAccountsByKind(accounts);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('loan');
    expect(groups[0].subtotal).toBe(-700_00);
  });

  it('omits a group entirely when it has no accounts', () => {
    const accounts = [{ id: 1, categoryKind: 'cash' as const, currentBalance: 0 }];
    const groups = groupAccountsByKind(accounts);
    expect(groups).toEqual([{ kind: 'cash', accounts, subtotal: 0 }]);
  });
});
