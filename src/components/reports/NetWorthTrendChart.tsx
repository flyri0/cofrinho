import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { NetWorthTrendEntry } from '@/store';
import { formatMonthShort } from '@/lib/month';
import { formatCents } from '@/lib/money';

export interface NetWorthTrendChartProps {
  data: NetWorthTrendEntry[];
}

const HALF_HEIGHT = 80;

// see technical-specification.md §5.9/§8.4 — "sum of all accounts (including
// tracking) minus debts, month-over-month trend". Bars grow up from a zero
// baseline for a positive net worth, down for a negative one.
export function NetWorthTrendChart({ data }: NetWorthTrendChartProps) {
  const { t, i18n } = useTranslation();

  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-base text-gray-500">
          {t('reports.netWorth.emptyState')}
        </Text>
      </View>
    );
  }

  const latest = data[data.length - 1];
  const maxMagnitude = Math.max(1, ...data.map((entry) => Math.abs(entry.netWorth)));

  return (
    <View className="flex-1 p-4">
      <View className="mb-4">
        <Text className="text-xs text-gray-500">{t('reports.netWorth.current')}</Text>
        <Text
          className={`text-2xl font-bold ${latest.netWorth < 0 ? 'text-red-600' : 'text-gray-900'}`}
        >
          {formatCents(latest.netWorth, 'BRL', i18n.language)}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-5 px-1">
          {data.map((entry) => {
            const barHeight = Math.max(2, (Math.abs(entry.netWorth) / maxMagnitude) * HALF_HEIGHT);
            const isNegative = entry.netWorth < 0;
            return (
              <View key={entry.month} className="items-center gap-1.5">
                <View style={{ height: HALF_HEIGHT }} className="justify-end">
                  {!isNegative && (
                    <View className="w-4 rounded-t bg-blue-500" style={{ height: barHeight }} />
                  )}
                </View>
                <View className="h-px w-6 bg-gray-300" />
                <View style={{ height: HALF_HEIGHT }}>
                  {isNegative && (
                    <View className="w-4 rounded-b bg-red-500" style={{ height: barHeight }} />
                  )}
                </View>
                <Text className="text-xs text-gray-500">
                  {formatMonthShort(entry.month, i18n.language)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
