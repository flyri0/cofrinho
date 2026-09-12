import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatMonthShort } from '@/lib/month';
import { formatCents } from '@/lib/money';
import type { MonthlyIncomeVsSpending } from '@/lib/reports';

export interface IncomeVsSpendingChartProps {
  data: MonthlyIncomeVsSpending[];
}

const CHART_HEIGHT = 120;

// see technical-specification.md §5.9 — "Income vs. Spending: bar chart by
// month". Plain Views scaled by inline style (no charting library — see
// CategoryRow.tsx's progress bar for the same pattern already used elsewhere).
export function IncomeVsSpendingChart({ data }: IncomeVsSpendingChartProps) {
  const { t, i18n } = useTranslation();

  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-base text-gray-500 dark:text-gray-300">
          {t('reports.incomeVsSpending.emptyState')}
        </Text>
      </View>
    );
  }

  const totalIncome = data.reduce((sum, entry) => sum + entry.income, 0);
  const totalSpending = data.reduce((sum, entry) => sum + entry.spending, 0);
  const maxValue = Math.max(1, ...data.flatMap((entry) => [entry.income, entry.spending]));

  return (
    <View className="flex-1 p-4">
      <View className="mb-4 flex-row gap-6">
        <View>
          <Text className="text-xs text-gray-500 dark:text-gray-300">
            {t('reports.incomeVsSpending.income')}
          </Text>
          <Text className="text-base font-semibold text-success">
            {formatCents(totalIncome, 'BRL', i18n.language)}
          </Text>
        </View>
        <View>
          <Text className="text-xs text-gray-500 dark:text-gray-300">
            {t('reports.incomeVsSpending.spending')}
          </Text>
          <Text className="text-base font-semibold text-error">
            {formatCents(totalSpending, 'BRL', i18n.language)}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-end gap-5 px-1 pb-1">
          {data.map((entry) => (
            <View key={entry.month} className="items-center gap-1.5">
              <View className="flex-row items-end gap-1" style={{ height: CHART_HEIGHT }}>
                <View
                  className="w-3 rounded-t bg-success"
                  style={{ height: Math.max(2, (entry.income / maxValue) * CHART_HEIGHT) }}
                />
                <View
                  className="w-3 rounded-t bg-error"
                  style={{ height: Math.max(2, (entry.spending / maxValue) * CHART_HEIGHT) }}
                />
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-300">
                {formatMonthShort(entry.month, i18n.language)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
