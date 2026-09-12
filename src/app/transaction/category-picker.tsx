import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { groupCategoryBudgets } from '@/lib/categories';
import { formatCents } from '@/lib/money';
import { useCategoriesStore, useMonthBudgetStore } from '@/store';
import { useTransactionFormDraftStore } from '@/store/transactionFormDraftStore';

export default function CategoryPickerScreen() {
  const { t, i18n } = useTranslation();
  const groups = useCategoriesStore((s) => s.groups);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const numbersByCategory = useMonthBudgetStore((s) => s.numbersByCategory);
  const fetchMonthBudget = useMonthBudgetStore((s) => s.fetchMonthBudget);
  const draftType = useTransactionFormDraftStore((s) => s.type);
  const setField = useTransactionFormDraftStore((s) => s.setField);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMonthBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectCategory(id: number | null) {
    setField('categoryId', id);
    router.back();
  }

  const term = search.trim().toLowerCase();
  const filteredCategories = categoriesList.filter(
    (category) => !category.isSystem && (!term || category.name.toLowerCase().includes(term)),
  );
  const groupBudgets = groupCategoryBudgets(groups, filteredCategories, numbersByCategory);

  return (
    <View className="flex-1 bg-background">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('categoryPicker.searchPlaceholder')}
        className="m-4 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-base"
      />
      <FlatList
        data={groupBudgets}
        keyExtractor={(group) => String(group.group.id)}
        ListHeaderComponent={
          draftType === 'inflow' ? (
            <Pressable
              onPress={() => selectCategory(null)}
              className="border-b border-gray-100 dark:border-gray-800 px-4 py-3"
            >
              <Text className="text-base text-gray-900 dark:text-gray-100">
                {t('categoryPicker.incomeOption')}
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item: groupBudget }) => (
          <View>
            <View className="bg-surface px-4 py-2">
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {groupBudget.group.name}
              </Text>
            </View>
            {groupBudget.categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => selectCategory(category.id)}
                className="flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3"
              >
                <Text className="flex-1 text-base text-gray-900 dark:text-gray-100">
                  {category.icon ? `${category.icon} ` : ''}
                  {category.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-300">
                  {formatCents(
                    numbersByCategory[category.id]?.available ?? 0,
                    'BRL',
                    i18n.language,
                  )}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      />
    </View>
  );
}
