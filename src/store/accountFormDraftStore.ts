import { create } from 'zustand';

import type { AccountType } from '@/db/schema';

export interface AccountFormDraft {
  name: string;
  type: AccountType | null;
  balanceCents: number;
  interestRateAnnualInput: string;
  monthlyPaymentCents: number;
}

export interface AccountFormDraftState extends AccountFormDraft {
  setField: <K extends keyof AccountFormDraft>(key: K, value: AccountFormDraft[K]) => void;
  reset: (initial?: Partial<AccountFormDraft>) => void;
}

const emptyDraft: AccountFormDraft = {
  name: '',
  type: null,
  balanceCents: 0,
  interestRateAnnualInput: '',
  monthlyPaymentCents: 0,
};

// Ephemeral (not persisted) form state, shared across the New/Edit Account
// screen and the account type picker screen so a round-trip to the picker
// doesn't lose whatever the user already typed — see components/accounts/AccountForm.tsx.
export const useAccountFormDraftStore = create<AccountFormDraftState>((set) => ({
  ...emptyDraft,
  setField: (key, value) => set({ [key]: value } as Partial<AccountFormDraftState>),
  reset: (initial) => set({ ...emptyDraft, ...initial }),
}));
