import { isTransferLikeType, signedAmountForType, type TransactionType } from './transactionType';

export type TransactionFormErrorCode = 'required' | 'must_be_positive' | 'same_account';

export interface TransactionFormErrors {
  accountId?: TransactionFormErrorCode;
  toAccountId?: TransactionFormErrorCode;
  categoryId?: TransactionFormErrorCode;
  amount?: TransactionFormErrorCode;
  date?: TransactionFormErrorCode;
}

export function isTransactionFormValid(errors: TransactionFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

export interface TransactionFormValues {
  type: TransactionType;
  accountId: number | null;
  toAccountId: number | null;
  // Outflow requires one; Inflow is optional (blank = uncategorized Income, §2.1);
  // Transfer/Credit Card Payment never carry a category (§7.5).
  categoryId: number | null;
  amountCents: number;
  date: string;
}

export function validateTransactionForm(values: TransactionFormValues): TransactionFormErrors {
  const errors: TransactionFormErrors = {};

  if (values.accountId === null) errors.accountId = 'required';
  if (!values.date.trim()) errors.date = 'required';
  if (values.amountCents <= 0) errors.amount = 'must_be_positive';

  if (values.type === 'outflow' && values.categoryId === null) {
    errors.categoryId = 'required';
  }

  if (isTransferLikeType(values.type)) {
    if (values.toAccountId === null) {
      errors.toAccountId = 'required';
    } else if (values.accountId !== null && values.toAccountId === values.accountId) {
      errors.toAccountId = 'same_account';
    }
  }

  return errors;
}

export interface NewRegularTransactionRecord {
  accountId: number;
  categoryId: number | null;
  amount: number;
  payee: string | null;
  date: string;
  memo: string | null;
  flag: string | null;
  cleared: boolean;
  isTransfer: false;
}

// For 'outflow' and 'inflow' only — see buildTransferLegs for the other two types.
export function buildRegularTransactionRecord(values: {
  type: TransactionType;
  accountId: number;
  categoryId: number | null;
  amountCents: number;
  payee: string;
  date: string;
  memo: string;
  flag: string | null;
  cleared: boolean;
}): NewRegularTransactionRecord {
  return {
    accountId: values.accountId,
    categoryId: values.categoryId,
    amount: signedAmountForType(values.type, values.amountCents),
    payee: values.payee.trim() || null,
    date: values.date,
    memo: values.memo.trim() || null,
    flag: values.flag,
    cleared: values.cleared,
    isTransfer: false,
  };
}

export interface TransferLegRecord {
  accountId: number;
  amount: number;
}

export interface TransferLegs {
  fromLeg: TransferLegRecord;
  toLeg: TransferLegRecord;
}

// Shared by 'transfer' and 'credit_card_payment' — both move money between two
// accounts via two linked transaction rows (§4.8), never touching a category.
export function buildTransferLegs(values: {
  accountId: number;
  toAccountId: number;
  amountCents: number;
}): TransferLegs {
  return {
    fromLeg: { accountId: values.accountId, amount: -values.amountCents },
    toLeg: { accountId: values.toAccountId, amount: values.amountCents },
  };
}
