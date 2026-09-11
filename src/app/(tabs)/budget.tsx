import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { CategoryRow } from '@/components/budget/CategoryRow';
import { CoverOverspendingModal } from '@/components/budget/CoverOverspendingModal';
import { QuickAssignModal } from '@/components/budget/QuickAssignModal';
import { groupCategoryBudgets } from '@/lib/categories';
import { formatCents } from '@/lib/money';
import { formatMonthLabel, shiftMonth } from '@/lib/month';
import {
  useCategoriesStore,
  useMonthBudgetStore,
  type CategoryRow as CategoryRowData,
} from '@/store';

export default function BudgetScreen() {
  const { t, i18n } = useTranslation();
  const groupsList = useCategoriesStore((s) => s.groups);
  const categoriesList = useCategoriesStore((s) => s.categories);
  const fetchCategories = useCategoriesStore((s) => s.fetchAll);

  const selectedMonth = useMonthBudgetStore((s) => s.selectedMonth);
  const numbersByCategory = useMonthBudgetStore((s) => s.numbersByCategory);
  const setMonth = useMonthBudgetStore((s) => s.setMonth);
  const fetchMonthBudget = useMonthBudgetStore((s) => s.fetchMonthBudget);
  const assignAmount = useMonthBudgetStore((s) => s.assignAmount);
  const coverOverspending = useMonthBudgetStore((s) => s.coverOverspending);

  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
  const [quickAssignCategory, setQuickAssignCategory] = useState<CategoryRowData | null>(null);
  const [coverTargetCategory, setCoverTargetCategory] = useState<CategoryRowData | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [fetchCategories]),
  );

  useEffect(() => {
    fetchMonthBudget();
  }, [selectedMonth, fetchMonthBudget]);

  const groups = groupCategoryBudgets(groupsList, categoriesList, numbersByCategory);

  function toggleGroup(groupId: number) {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const coverCandidates = coverTargetCategory
    ? categoriesList
        .filter(
          (c) => c.id !== coverTargetCategory.id && (numbersByCategory[c.id]?.available ?? 0) > 0,
        )
        .map((c) => ({
          id: c.id,
          name: c.name,
          available: numbersByCategory[c.id]?.available ?? 0,
        }))
    : [];

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3">
        <Pressable onPress={() => setMonth(shiftMonth(selectedMonth, -1))} hitSlop={8}>
          <Text className="text-xl text-gray-500">‹</Text>
        </Pressable>
        <Text className="text-base font-semibold text-gray-900">
          {formatMonthLabel(selectedMonth, i18n.language)}
        </Text>
        <Pressable onPress={() => setMonth(shiftMonth(selectedMonth, 1))} hitSlop={8}>
          <Text className="text-xl text-gray-500">›</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/category/manage')}
        className="border-b border-gray-200 px-4 py-2.5"
      >
        <Text className="text-sm font-medium text-blue-600">{t('budget.manageCategories')}</Text>
      </Pressable>

      {groups.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-6">
          <Text className="text-lg font-semibold text-gray-900">
            {t('budget.emptyState.title')}
          </Text>
          <Text className="text-center text-base text-gray-500">
            {t('budget.emptyState.message')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => String(group.group.id)}
          renderItem={({ item: groupBudget }) => (
            <View>
              <Pressable
                onPress={() => toggleGroup(groupBudget.group.id)}
                className="flex-row items-center justify-between bg-gray-50 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-gray-600">
                  {groupBudget.group.name}
                </Text>
                <View className="flex-row gap-3">
                  <Text className="text-sm text-gray-500">
                    {formatCents(groupBudget.assignedTotal, 'BRL', i18n.language)}
                  </Text>
                  <Text
                    className={`text-sm font-medium ${
                      groupBudget.availableTotal < 0 ? 'text-red-600' : 'text-gray-700'
                    }`}
                  >
                    {formatCents(groupBudget.availableTotal, 'BRL', i18n.language)}
                  </Text>
                </View>
              </Pressable>
              {!collapsedGroupIds.has(groupBudget.group.id) &&
                groupBudget.categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    numbers={
                      numbersByCategory[category.id] ?? { assigned: 0, activity: 0, available: 0 }
                    }
                    onPress={() => setQuickAssignCategory(category)}
                    onLongPress={() => router.push(`/category/${category.id}`)}
                    onCoverPress={() => setCoverTargetCategory(category)}
                  />
                ))}
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
        />
      )}

      <QuickAssignModal
        visible={quickAssignCategory !== null}
        categoryName={quickAssignCategory?.name ?? ''}
        initialCents={
          quickAssignCategory ? (numbersByCategory[quickAssignCategory.id]?.assigned ?? 0) : 0
        }
        targetCents={
          quickAssignCategory ? (numbersByCategory[quickAssignCategory.id]?.target ?? null) : null
        }
        onClose={() => setQuickAssignCategory(null)}
        onSave={(cents) => {
          if (quickAssignCategory) assignAmount(quickAssignCategory.id, cents);
        }}
      />

      <CoverOverspendingModal
        visible={coverTargetCategory !== null}
        candidates={coverCandidates}
        onClose={() => setCoverTargetCategory(null)}
        onSelect={(sourceId) => {
          if (coverTargetCategory) coverOverspending(coverTargetCategory.id, sourceId);
          setCoverTargetCategory(null);
        }}
      />
    </View>
  );
}
