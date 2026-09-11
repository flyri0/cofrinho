import { useEffect } from 'react';
import { router } from 'expo-router';

import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactionFormDraftStore } from '@/store/transactionFormDraftStore';
import { useTransactionsStore } from '@/store';

export default function NewTransactionScreen() {
  const reset = useTransactionFormDraftStore((s) => s.reset);
  const createTransaction = useTransactionsStore((s) => s.createTransaction);

  useEffect(() => {
    reset();
    // Only run once, on entering the screen — not on every re-render, or we'd
    // wipe out whatever the user picked after a round-trip to a picker screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TransactionForm
      mode="create"
      onSubmit={(draft) =>
        createTransaction({
          type: draft.type,
          accountId: draft.accountId,
          toAccountId: draft.toAccountId,
          categoryId: draft.categoryId,
          amountCents: draft.amountCents,
          payee: draft.payee,
          date: draft.date,
          memo: draft.memo,
          flag: draft.flag,
          cleared: draft.cleared,
        })
      }
      onSuccess={() => router.back()}
    />
  );
}
