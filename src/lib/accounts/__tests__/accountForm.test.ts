import {
  buildAccountLoanDetailsRecord,
  buildAccountRecordUpdate,
  buildNewAccountRecord,
  isAccountFormValid,
  parseInterestRate,
  validateAccountForm,
} from '../accountForm';

describe('validateAccountForm', () => {
  const baseNonLoan = {
    name: 'Checking',
    type: 'checking' as const,
    interestRateAnnualInput: '',
    monthlyPaymentCents: 0,
  };

  it('passes for a normal, non-loan account with a name', () => {
    const errors = validateAccountForm(baseNonLoan);
    expect(isAccountFormValid(errors)).toBe(true);
  });

  it('requires a name', () => {
    const errors = validateAccountForm({ ...baseNonLoan, name: '   ' });
    expect(errors.name).toBe('required');
    expect(isAccountFormValid(errors)).toBe(false);
  });

  it('does not require loan fields for non-loan types, even when blank', () => {
    const errors = validateAccountForm({
      ...baseNonLoan,
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    expect(errors.interestRateAnnual).toBeUndefined();
    expect(errors.monthlyPayment).toBeUndefined();
  });

  it('requires a valid interest rate and a positive monthly payment for loan types', () => {
    const errors = validateAccountForm({
      name: 'Car Loan',
      type: 'auto_loan',
      interestRateAnnualInput: '',
      monthlyPaymentCents: 0,
    });
    expect(errors.interestRateAnnual).toBe('invalid_number');
    expect(errors.monthlyPayment).toBe('must_be_positive');
  });

  it('rejects a negative interest rate for loan types', () => {
    const errors = validateAccountForm({
      name: 'Car Loan',
      type: 'auto_loan',
      interestRateAnnualInput: '-5',
      monthlyPaymentCents: 100_00,
    });
    expect(errors.interestRateAnnual).toBe('must_be_positive');
  });

  it('accepts a valid loan form, comma-decimal interest rate included', () => {
    const errors = validateAccountForm({
      name: 'Car Loan',
      type: 'auto_loan',
      interestRateAnnualInput: '8,5',
      monthlyPaymentCents: 150_00,
    });
    expect(isAccountFormValid(errors)).toBe(true);
  });
});

describe('parseInterestRate', () => {
  it('parses a plain number', () => {
    expect(parseInterestRate('8.5')).toBe(8.5);
  });

  it('parses a pt-BR comma decimal', () => {
    expect(parseInterestRate('8,5')).toBe(8.5);
  });

  it('returns null for blank input', () => {
    expect(parseInterestRate('  ')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseInterestRate('abc')).toBeNull();
  });
});

describe('buildNewAccountRecord', () => {
  it('derives categoryKind/isBudgetAccount and mirrors balance into currentBalance for the normal case', () => {
    const record = buildNewAccountRecord(
      { name: '  Checking  ', type: 'checking', balanceCents: 50_000 },
      0,
    );

    expect(record).toEqual({
      name: 'Checking',
      type: 'checking',
      categoryKind: 'cash',
      isBudgetAccount: true,
      initialBalance: 50_000,
      currentBalance: 50_000,
      sortOrder: 0,
    });
  });

  it('is the first account created (sortOrder 0, zero starting balance)', () => {
    const record = buildNewAccountRecord({ name: 'Wallet', type: 'cash', balanceCents: 0 }, 0);
    expect(record.initialBalance).toBe(0);
    expect(record.currentBalance).toBe(0);
    expect(record.sortOrder).toBe(0);
  });

  it('allows a negative starting balance for a credit account (existing debt)', () => {
    const record = buildNewAccountRecord(
      { name: 'Credit Card', type: 'credit_card', balanceCents: -20_000 },
      2,
    );
    expect(record.categoryKind).toBe('credit');
    expect(record.isBudgetAccount).toBe(true);
    expect(record.initialBalance).toBe(-20_000);
    expect(record.currentBalance).toBe(-20_000);
  });

  it('marks a tracking account as not a budget account', () => {
    const record = buildNewAccountRecord(
      { name: 'Brokerage', type: 'asset', balanceCents: 1_000_00 },
      1,
    );
    expect(record.categoryKind).toBe('tracking');
    expect(record.isBudgetAccount).toBe(false);
  });
});

describe('buildAccountRecordUpdate', () => {
  it('re-derives categoryKind/isBudgetAccount and excludes balance fields', () => {
    const update = buildAccountRecordUpdate({ name: '  Savings  ', type: 'savings' });
    expect(update).toEqual({
      name: 'Savings',
      type: 'savings',
      categoryKind: 'cash',
      isBudgetAccount: true,
    });
    expect('initialBalance' in update).toBe(false);
    expect('currentBalance' in update).toBe(false);
  });
});

describe('buildAccountLoanDetailsRecord', () => {
  it('builds a record for a normal loan account', () => {
    const record = buildAccountLoanDetailsRecord({
      type: 'mortgage',
      interestRateAnnualInput: '9.75',
      monthlyPaymentCents: 250_000,
    });
    expect(record).toEqual({ interestRateAnnual: 9.75, monthlyPayment: 250_000 });
  });

  it('returns null for a non-loan type', () => {
    const record = buildAccountLoanDetailsRecord({
      type: 'checking',
      interestRateAnnualInput: '9.75',
      monthlyPaymentCents: 250_000,
    });
    expect(record).toBeNull();
  });

  it('returns null when the interest rate cannot be parsed', () => {
    const record = buildAccountLoanDetailsRecord({
      type: 'auto_loan',
      interestRateAnnualInput: '',
      monthlyPaymentCents: 100_00,
    });
    expect(record).toBeNull();
  });

  it('accepts a 0% interest rate loan (edge case)', () => {
    const record = buildAccountLoanDetailsRecord({
      type: 'personal_loan',
      interestRateAnnualInput: '0',
      monthlyPaymentCents: 50_000,
    });
    expect(record).toEqual({ interestRateAnnual: 0, monthlyPayment: 50_000 });
  });
});
