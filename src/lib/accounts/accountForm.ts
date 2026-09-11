import type { AccountCategoryKind, AccountType } from '@/db/schema';

import {
  deriveAccountCategoryKind,
  isBudgetAccountKind,
  isLoanAccountType,
} from './accountTypeGroups';

export type AccountFormErrorCode = 'required' | 'invalid_number' | 'must_be_positive';

export interface AccountFormErrors {
  name?: AccountFormErrorCode;
  interestRateAnnual?: AccountFormErrorCode;
  monthlyPayment?: AccountFormErrorCode;
}

export function isAccountFormValid(errors: AccountFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// Accepts both "8.5" and "8,5" (pt-BR decimal comma); returns null if unparsable.
export function parseInterestRate(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export interface AccountFormCommonValues {
  name: string;
  type: AccountType;
  // Only read/validated when `type` falls in the loan/financing group (§5.6).
  interestRateAnnualInput: string;
  monthlyPaymentCents: number;
}

// Shared by both create and edit: everything except the balance, which is
// create-only per §5.6 ("current balance becomes read-only" once an account exists).
export function validateAccountForm(values: AccountFormCommonValues): AccountFormErrors {
  const errors: AccountFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'required';
  }

  if (isLoanAccountType(values.type)) {
    const rate = parseInterestRate(values.interestRateAnnualInput);
    if (rate === null || rate < 0) {
      errors.interestRateAnnual = rate === null ? 'invalid_number' : 'must_be_positive';
    }
    if (values.monthlyPaymentCents <= 0) {
      errors.monthlyPayment = 'must_be_positive';
    }
  }

  return errors;
}

export interface DerivedAccountFields {
  categoryKind: AccountCategoryKind;
  isBudgetAccount: boolean;
}

function deriveAccountFields(type: AccountType): DerivedAccountFields {
  const categoryKind = deriveAccountCategoryKind(type);
  return { categoryKind, isBudgetAccount: isBudgetAccountKind(categoryKind) };
}

export interface NewAccountRecord extends DerivedAccountFields {
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  sortOrder: number;
}

// Builds the `accounts` insert payload for a brand-new account. `currentBalance`
// starts equal to `initialBalance` since no transactions exist yet (§4.2).
export function buildNewAccountRecord(
  values: { name: string; type: AccountType; balanceCents: number },
  sortOrder: number,
): NewAccountRecord {
  return {
    name: values.name.trim(),
    type: values.type,
    ...deriveAccountFields(values.type),
    initialBalance: values.balanceCents,
    currentBalance: values.balanceCents,
    sortOrder,
  };
}

export interface AccountRecordUpdate extends DerivedAccountFields {
  name: string;
  type: AccountType;
}

// Balance is intentionally excluded — §5.6 makes it read-only once the account exists.
export function buildAccountRecordUpdate(values: {
  name: string;
  type: AccountType;
}): AccountRecordUpdate {
  return {
    name: values.name.trim(),
    type: values.type,
    ...deriveAccountFields(values.type),
  };
}

export interface NewAccountLoanDetailsRecord {
  interestRateAnnual: number;
  monthlyPayment: number;
}

// Returns null when the type isn't a loan type, or the interest rate can't be parsed.
export function buildAccountLoanDetailsRecord(values: {
  type: AccountType;
  interestRateAnnualInput: string;
  monthlyPaymentCents: number;
}): NewAccountLoanDetailsRecord | null {
  if (!isLoanAccountType(values.type)) return null;

  const interestRateAnnual = parseInterestRate(values.interestRateAnnualInput);
  if (interestRateAnnual === null) return null;

  return { interestRateAnnual, monthlyPayment: values.monthlyPaymentCents };
}
