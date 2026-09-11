import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactionFormDraftStore } from '@/src/store/transactionFormDraftStore';
import { useTransactionsStore } from '@/src/store';

export default function EditTransactionScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);

  const reset = useTransactionFormDraftStore((s) => s.reset);
  const getTransactionFormValues = useTransactionsStore((s) => s.getTransactionFormValues);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getTransactionFormValues(transactionId).then((values) => {
      if (cancelled || !values) return;
      reset(values);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
    // Only load once, on entering the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  function handleDelete() {
    Alert.alert(t('transactionForm.deleteConfirm.title'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('transactionForm.deleteConfirm.confirm'),
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(transactionId);
          router.back();
        },
      },
    ]);
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <TransactionForm
      mode="edit"
      onSubmit={(draft) =>
        updateTransaction(transactionId, {
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
      onDelete={handleDelete}
    />
  );
}
