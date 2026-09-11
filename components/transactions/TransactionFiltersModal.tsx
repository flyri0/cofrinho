import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AccountRow, CategoryRow, TransactionFilters } from '@/src/store';

export interface TransactionFiltersModalProps {
  visible: boolean;
  accounts: AccountRow[];
  categories: CategoryRow[];
  filters: TransactionFilters;
  onClose: () => void;
  onApply: (filters: TransactionFilters) => void;
}

const STATUS_OPTIONS = ['all', 'cleared', 'uncleared'] as const;

// see technical-specification.md §5.7 — "Account (multi-select), Category
// (multi-select), Period (date range), Status (All / Uncleared / Cleared)"
export function TransactionFiltersModal({
  visible,
  accounts,
  categories,
  filters,
  onClose,
  onApply,
}: TransactionFiltersModalProps) {
  const { t } = useTranslation();
  const [accountIds, setAccountIds] = useState<number[]>(filters.accountIds ?? []);
  const [categoryIds, setCategoryIds] = useState<number[]>(filters.categoryIds ?? []);
  const [status, setStatus] = useState<TransactionFilters['status']>(filters.status ?? 'all');

  function toggle(list: number[], id: number, setList: (ids: number[]) => void) {
    setList(list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id]);
  }

  function handleApply() {
    onApply({ accountIds, categoryIds, status, searchText: filters.searchText });
    onClose();
  }

  function handleClear() {
    setAccountIds([]);
    setCategoryIds([]);
    setStatus('all');
    onApply({ searchText: filters.searchText });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="max-h-[80%] rounded-t-2xl bg-white p-4"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="mb-3 text-center text-base font-semibold text-gray-900">
            {t('transactions.filters.title')}
          </Text>
          <ScrollView>
            <Text className="mb-2 text-sm font-semibold text-gray-600">
              {t('transactions.filters.status')}
            </Text>
            <View className="mb-4 flex-row gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setStatus(option)}
                  className={`rounded-full px-3 py-1.5 ${status === option ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                  <Text className={`text-sm ${status === option ? 'text-white' : 'text-gray-700'}`}>
                    {t(
                      `transactions.filters.status${option.charAt(0).toUpperCase()}${option.slice(1)}`,
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-gray-600">
              {t('transactions.filters.account')}
            </Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {accounts.map((account) => (
                <Pressable
                  key={account.id}
                  onPress={() => toggle(accountIds, account.id, setAccountIds)}
                  className={`rounded-full px-3 py-1.5 ${accountIds.includes(account.id) ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                  <Text
                    className={`text-sm ${accountIds.includes(account.id) ? 'text-white' : 'text-gray-700'}`}
                  >
                    {account.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-gray-600">
              {t('transactions.filters.category')}
            </Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => toggle(categoryIds, category.id, setCategoryIds)}
                  className={`rounded-full px-3 py-1.5 ${categoryIds.includes(category.id) ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                  <Text
                    className={`text-sm ${categoryIds.includes(category.id) ? 'text-white' : 'text-gray-700'}`}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row gap-2">
            <Pressable
              onPress={handleClear}
              className="flex-1 items-center rounded-lg bg-gray-100 py-3"
            >
              <Text className="text-sm font-semibold text-gray-700">
                {t('transactions.filters.clear')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              className="flex-1 items-center rounded-lg bg-blue-600 py-3"
            >
              <Text className="text-sm font-semibold text-white">
                {t('transactions.filters.apply')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
