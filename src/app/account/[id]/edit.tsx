import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AccountForm } from '@/components/accounts/AccountForm';
import { useAccountFormDraftStore } from '@/store/accountFormDraftStore';
import { useAccountsStore } from '@/store';

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);

  const reset = useAccountFormDraftStore((s) => s.reset);
  const getAccountWithLoanDetails = useAccountsStore((s) => s.getAccountWithLoanDetails);
  const updateAccount = useAccountsStore((s) => s.updateAccount);

  const [currentBalanceCents, setCurrentBalanceCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAccountWithLoanDetails(accountId).then((account) => {
      if (cancelled || !account) return;

      reset({
        name: account.name,
        type: account.type,
        interestRateAnnualInput:
          account.loanDetails !== null ? String(account.loanDetails.interestRateAnnual) : '',
        monthlyPaymentCents: account.loanDetails?.monthlyPayment ?? 0,
      });
      setCurrentBalanceCents(account.currentBalance);
    });

    return () => {
      cancelled = true;
    };
    // Only load once, on entering the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (currentBalanceCents === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AccountForm
      mode="edit"
      currentBalanceCents={currentBalanceCents}
      onSubmit={(draft) =>
        updateAccount(accountId, {
          name: draft.name,
          type: draft.type!,
          interestRateAnnualInput: draft.interestRateAnnualInput,
          monthlyPaymentCents: draft.monthlyPaymentCents,
        })
      }
      onSuccess={() => router.back()}
    />
  );
}
