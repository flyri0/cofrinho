import { FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CategoryRow } from '@/store';
import { formatCents } from '@/lib/money';
import type { SpendingBreakdownEntry } from '@/lib/reports';

export interface SpendingBreakdownListProps {
  entries: SpendingBreakdownEntry[];
  categoriesById: Map<number, CategoryRow>;
  onPressCategory: (categoryId: number) => void;
}

// see technical-specification.md §5.9 — "by category... listed in descending
// order by amount" + "tapping a category leads straight to Category Detail".
export function SpendingBreakdownList({
  entries,
  categoriesById,
  onPressCategory,
}: SpendingBreakdownListProps) {
  const { t, i18n } = useTranslation();

  if (entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-base text-gray-500">
          {t('reports.spendingBreakdown.emptyState')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(entry) => String(entry.categoryId)}
      ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
      renderItem={({ item }) => {
        const category = categoriesById.get(item.categoryId);
        return (
          <Pressable
            onPress={() => onPressCategory(item.categoryId)}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-1 flex-row items-center gap-2">
              {category?.icon && <Text className="text-lg">{category.icon}</Text>}
              <Text className="flex-1 text-base text-gray-900" numberOfLines={1}>
                {category?.name ?? '—'}
              </Text>
            </View>
            <Text className="text-base font-medium text-red-600">
              {formatCents(item.amount, 'BRL', i18n.language)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
