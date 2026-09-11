import { create } from 'zustand';

import type { TransactionType } from '@/lib/transactions';

export interface TransactionFormDraft {
  type: TransactionType;
  accountId: number | null;
  toAccountId: number | null;
  categoryId: number | null;
  amountCents: number;
  payee: string;
  date: string;
  memo: string;
  flag: string | null;
  cleared: boolean;
}

export interface TransactionFormDraftState extends TransactionFormDraft {
  setField: <K extends keyof TransactionFormDraft>(key: K, value: TransactionFormDraft[K]) => void;
  reset: (initial?: Partial<TransactionFormDraft>) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): TransactionFormDraft {
  return {
    type: 'outflow',
    accountId: null,
    toAccountId: null,
    categoryId: null,
    amountCents: 0,
    payee: '',
    date: todayIso(),
    memo: '',
    flag: null,
    cleared: false,
  };
}

// Ephemeral (not persisted) form state, shared across the New/Edit Transaction
// screen and the category/account picker screens — see accountFormDraftStore.ts
// for why a cross-screen round trip needs this instead of local component state.
export const useTransactionFormDraftStore = create<TransactionFormDraftState>((set) => ({
  ...emptyDraft(),
  setField: (key, value) => set({ [key]: value } as Partial<TransactionFormDraftState>),
  reset: (initial) => set({ ...emptyDraft(), ...initial }),
}));
