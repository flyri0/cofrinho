import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { AccountForm } from '@/components/accounts/AccountForm';
import { useAccountFormDraftStore } from '@/src/store/accountFormDraftStore';
import { useAccountsStore } from '@/src/store';

export default function NewAccountScreen() {
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const reset = useAccountFormDraftStore((s) => s.reset);
  const createAccount = useAccountsStore((s) => s.createAccount);

  useEffect(() => {
    reset();
    // Only run once, on entering the screen — not on every re-render, or we'd
    // wipe out whatever the user typed after a round-trip to the type picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AccountForm
      mode="create"
      onSubmit={(draft) =>
        createAccount({
          name: draft.name,
          type: draft.type!,
          balanceCents: draft.balanceCents,
          interestRateAnnualInput: draft.interestRateAnnualInput,
          monthlyPaymentCents: draft.monthlyPaymentCents,
        })
      }
      onSuccess={() => {
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          router.back();
        }
      }}
    />
  );
}
