import { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';

import { formatCents } from '@/src/lib/money';
import { useBudgetStore } from '@/src/store';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const readyToAssign = useBudgetStore((s) => s.readyToAssign);
  const refresh = useBudgetStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const isNegative = readyToAssign < 0;

  return (
    <View className="flex-1 bg-white p-4">
      <View className="items-center gap-1 rounded-2xl bg-gray-50 p-6">
        <Text className="text-sm font-medium text-gray-500">{t('home.readyToAssign.label')}</Text>
        <Text className={`text-4xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
          {formatCents(readyToAssign, 'BRL', i18n.language)}
        </Text>
      </View>
    </View>
  );
}
