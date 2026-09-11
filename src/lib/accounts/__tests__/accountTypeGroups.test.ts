import {
  ACCOUNT_CATEGORY_KIND_ORDER,
  deriveAccountCategoryKind,
  isBudgetAccountKind,
  isLoanAccountType,
} from '../accountTypeGroups';

describe('deriveAccountCategoryKind', () => {
  it('maps cash-like types to "cash"', () => {
    expect(deriveAccountCategoryKind('checking')).toBe('cash');
    expect(deriveAccountCategoryKind('savings')).toBe('cash');
    expect(deriveAccountCategoryKind('cash')).toBe('cash');
  });

  it('maps credit types to "credit"', () => {
    expect(deriveAccountCategoryKind('credit_card')).toBe('credit');
    expect(deriveAccountCategoryKind('line_of_credit')).toBe('credit');
  });

  it('maps loan/financing types to "loan"', () => {
    expect(deriveAccountCategoryKind('mortgage')).toBe('loan');
    expect(deriveAccountCategoryKind('personal_loan')).toBe('loan');
  });

  it('maps tracking types to "tracking"', () => {
    expect(deriveAccountCategoryKind('asset')).toBe('tracking');
    expect(deriveAccountCategoryKind('liability')).toBe('tracking');
  });

  it('throws for a type outside the closed AccountType union (defensive edge case)', () => {
    expect(() => deriveAccountCategoryKind('not_a_real_type' as never)).toThrow(
      'Unknown account type: not_a_real_type',
    );
  });
});

describe('isBudgetAccountKind', () => {
  it('is true for cash and credit, false for loan and tracking', () => {
    expect(isBudgetAccountKind('cash')).toBe(true);
    expect(isBudgetAccountKind('credit')).toBe(true);
    expect(isBudgetAccountKind('loan')).toBe(false);
    expect(isBudgetAccountKind('tracking')).toBe(false);
  });
});

describe('isLoanAccountType', () => {
  it('is true only for loan/financing types', () => {
    expect(isLoanAccountType('auto_loan')).toBe(true);
    expect(isLoanAccountType('checking')).toBe(false);
    expect(isLoanAccountType('credit_card')).toBe(false);
    expect(isLoanAccountType('asset')).toBe(false);
  });
});

describe('ACCOUNT_CATEGORY_KIND_ORDER', () => {
  it('lists the 4 groups in the spec order: cash, credit, loan, tracking', () => {
    expect(ACCOUNT_CATEGORY_KIND_ORDER).toEqual(['cash', 'credit', 'loan', 'tracking']);
  });
});
