import {
  buildRegularTransactionRecord,
  buildTransferLegs,
  isTransactionFormValid,
  validateTransactionForm,
} from '../transactionForm';

describe('validateTransactionForm', () => {
  const base = {
    accountId: 1,
    toAccountId: null,
    categoryId: 10,
    amountCents: 5_000,
    date: '2026-05-01',
  };

  it('passes for a normal outflow with a category', () => {
    expect(isTransactionFormValid(validateTransactionForm({ ...base, type: 'outflow' }))).toBe(
      true,
    );
  });

  it('requires a category for outflow', () => {
    const errors = validateTransactionForm({ ...base, type: 'outflow', categoryId: null });
    expect(errors.categoryId).toBe('required');
  });

  it('does not require a category for inflow (blank = uncategorized Income)', () => {
    const errors = validateTransactionForm({ ...base, type: 'inflow', categoryId: null });
    expect(errors.categoryId).toBeUndefined();
    expect(isTransactionFormValid(errors)).toBe(true);
  });

  it('requires a destination account for transfer and credit_card_payment', () => {
    expect(
      validateTransactionForm({ ...base, type: 'transfer', toAccountId: null }).toAccountId,
    ).toBe('required');
    expect(
      validateTransactionForm({ ...base, type: 'credit_card_payment', toAccountId: null })
        .toAccountId,
    ).toBe('required');
  });

  it('rejects a transfer to the same account (edge case)', () => {
    const errors = validateTransactionForm({ ...base, type: 'transfer', toAccountId: 1 });
    expect(errors.toAccountId).toBe('same_account');
  });

  it('requires the account, date, and a positive amount regardless of type (first/blank form)', () => {
    const errors = validateTransactionForm({
      type: 'outflow',
      accountId: null,
      toAccountId: null,
      categoryId: null,
      amountCents: 0,
      date: '',
    });
    expect(errors).toEqual({
      accountId: 'required',
      date: 'required',
      amount: 'must_be_positive',
      categoryId: 'required',
    });
  });
});

describe('buildRegularTransactionRecord', () => {
  it('negates the amount for outflow and trims blank optional fields to null', () => {
    const record = buildRegularTransactionRecord({
      type: 'outflow',
      accountId: 1,
      categoryId: 10,
      amountCents: 5_000,
      payee: '  Market  ',
      date: '2026-05-01',
      memo: '   ',
      flag: null,
      cleared: false,
    });

    expect(record).toEqual({
      accountId: 1,
      categoryId: 10,
      amount: -5_000,
      payee: 'Market',
      date: '2026-05-01',
      memo: null,
      flag: null,
      cleared: false,
      isTransfer: false,
    });
  });

  it('keeps inflow amounts positive and allows a null category (Income)', () => {
    const record = buildRegularTransactionRecord({
      type: 'inflow',
      accountId: 1,
      categoryId: null,
      amountCents: 100_000,
      payee: 'Employer',
      date: '2026-05-05',
      memo: '',
      flag: null,
      cleared: true,
    });

    expect(record.amount).toBe(100_000);
    expect(record.categoryId).toBeNull();
    expect(record.cleared).toBe(true);
  });

  it('stores a blank payee as null (edge case)', () => {
    const record = buildRegularTransactionRecord({
      type: 'transfer',
      accountId: 1,
      categoryId: null,
      amountCents: 100_00,
      payee: '   ',
      date: '2026-05-05',
      memo: '',
      flag: null,
      cleared: false,
    });

    expect(record.payee).toBeNull();
  });
});

describe('buildTransferLegs', () => {
  it('builds a negative "from" leg and a positive "to" leg for the same amount', () => {
    const legs = buildTransferLegs({ accountId: 1, toAccountId: 2, amountCents: 10_000 });
    expect(legs).toEqual({
      fromLeg: { accountId: 1, amount: -10_000 },
      toLeg: { accountId: 2, amount: 10_000 },
    });
  });
});
