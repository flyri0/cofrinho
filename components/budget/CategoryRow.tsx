import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { CategoryRow as CategoryRowData } from '@/src/store';
import { calculateCategorySpentRatio, type CategoryNumbers } from '@/src/lib/categories';
import { formatCents } from '@/src/lib/money';

export interface CategoryRowProps {
  category: CategoryRowData;
  numbers: CategoryNumbers;
  onPress: () => void;
  onLongPress: () => void;
  onCoverPress: () => void;
}

// see technical-specification.md §5.3 — category row with assigned/available/progress bar
export function CategoryRow({
  category,
  numbers,
  onPress,
  onLongPress,
  onCoverPress,
}: CategoryRowProps) {
  const { t, i18n } = useTranslation();
  const isOverspent = numbers.available < 0;
  const progress = Math.min(
    1,
    calculateCategorySpentRatio({ assigned: numbers.assigned, activity: numbers.activity }),
  );

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} className="px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          {category.icon && <Text className="text-lg">{category.icon}</Text>}
          <Text className="flex-1 text-base text-gray-900" numberOfLines={1}>
            {category.name}
          </Text>
        </View>
        <Text className="w-20 text-right text-sm text-gray-500">
          {formatCents(numbers.assigned, 'BRL', i18n.language)}
        </Text>
        <Text
          className={`w-24 text-right text-base font-medium ${isOverspent ? 'text-red-600' : 'text-gray-900'}`}
        >
          {formatCents(numbers.available, 'BRL', i18n.language)}
        </Text>
      </View>

      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <View
          className={`h-1.5 rounded-full ${isOverspent ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>

      {isOverspent && (
        <Pressable onPress={onCoverPress} className="mt-1.5 flex-row items-center gap-1">
          <Text className="text-xs text-red-600">{t('budget.overspentAlert')}</Text>
          <Text className="text-xs font-semibold text-red-600 underline">
            {t('budget.coverShortcut')}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}
