import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { TransactionFiltersModal } from '@/components/transactions/TransactionFiltersModal';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { useAccountsStore, useCategoriesStore, useTransactionsStore } from '@/src/store';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();

  const transactionsList = useTransactionsStore((s) => s.transactions);
  const filters = useTransactionsStore((s) => s.filters);
  const setFilters = useTransactionsStore((s) => s.setFilters);
  const fetchTransactions = useTransactionsStore((s) => s.fetchTransactions);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const setCleared = useTransactionsStore((s) => s.setCleared);

  const accountsList = useAccountsStore((s) => s.accounts);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const fetchCategories = useCategoriesStore((s) => s.fetchAll);

  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [searchText, setSearchText] = useState(filters.searchText ?? '');

  // Arriving from an account's "View ledger" action pre-filters to that account.
  useEffect(() => {
    if (accountId) setFilters({ ...filters, accountIds: [Number(accountId)] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
      fetchCategories();
      fetchTransactions();
    }, [fetchAccounts, fetchCategories, fetchTransactions]),
  );

  function currencyFor(accId: number): string {
    return accountsList.find((a) => a.id === accId)?.currency ?? 'BRL';
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 border-b border-gray-200 px-4 py-3">
        <TextInput
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            setFilters({ ...filters, searchText: text });
          }}
          onSubmitEditing={() => fetchTransactions()}
          placeholder={t('transactions.searchPlaceholder')}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <Pressable
          onPress={() => setIsFiltersVisible(true)}
          className="rounded-lg bg-gray-100 px-3 py-2.5"
        >
          <Text className="text-sm font-medium text-gray-700">
            {t('transactions.filters.title')}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/transaction/new')}
        className="border-b border-gray-200 px-4 py-2.5"
      >
        <Text className="text-sm font-medium text-blue-600">
          {t('transactions.addTransaction')}
        </Text>
      </Pressable>

      {transactionsList.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-lg font-semibold text-gray-900">
            {t('transactions.emptyState.title')}
          </Text>
          <Text className="text-center text-base text-gray-500">
            {t('transactions.emptyState.message')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactionsList}
          keyExtractor={(transaction) => String(transaction.id)}
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
          renderItem={({ item: transaction }) => (
            <TransactionListItem
              transaction={transaction}
              category={categoriesList.find((c) => c.id === transaction.categoryId)}
              currency={currencyFor(transaction.accountId)}
              onEdit={() => router.push(`/transaction/${transaction.id}/edit`)}
              onDuplicate={() => duplicateTransaction(transaction.id)}
              onDelete={() => deleteTransaction(transaction.id)}
              onToggleCleared={() => setCleared(transaction.id, !transaction.cleared)}
            />
          )}
        />
      )}

      <TransactionFiltersModal
        visible={isFiltersVisible}
        accounts={accountsList}
        categories={categoriesList}
        filters={filters}
        onClose={() => setIsFiltersVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          fetchTransactions();
        }}
      />
    </View>
  );
}
