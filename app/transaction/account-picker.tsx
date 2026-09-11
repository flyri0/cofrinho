import { FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';

import { formatCents } from '@/src/lib/money';
import { useAccountsStore } from '@/src/store';
import { useTransactionFormDraftStore } from '@/src/store/transactionFormDraftStore';

export default function AccountPickerScreen() {
  const { i18n } = useTranslation();
  const { field, filter } = useLocalSearchParams<{
    field: 'account' | 'toAccount';
    filter?: string;
  }>();
  const accountsList = useAccountsStore((s) => s.accounts);
  const setField = useTransactionFormDraftStore((s) => s.setField);

  const filteredAccounts =
    filter === 'creditCard'
      ? accountsList.filter((account) => account.type === 'credit_card')
      : accountsList;

  function selectAccount(id: number) {
    setField(field === 'toAccount' ? 'toAccountId' : 'accountId', id);
    router.back();
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={filteredAccounts}
        keyExtractor={(account) => String(account.id)}
        ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
        renderItem={({ item: account }) => (
          <Pressable
            onPress={() => selectAccount(account.id)}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <Text className="text-base text-gray-900">{account.name}</Text>
            <Text className="text-sm text-gray-500">
              {formatCents(account.currentBalance, account.currency, i18n.language)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
