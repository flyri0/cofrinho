import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { IncomeVsSpendingChart } from '@/components/reports/IncomeVsSpendingChart';
import { NetWorthTrendChart } from '@/components/reports/NetWorthTrendChart';
import { PeriodSelector } from '@/components/reports/PeriodSelector';
import { SpendingBreakdownList } from '@/components/reports/SpendingBreakdownList';
import { useCategoriesStore, useMonthBudgetStore, useReportsStore } from '@/store';

const REPORT_TABS = ['spendingBreakdown', 'incomeVsSpending', 'netWorth'] as const;
type ReportTab = (typeof REPORT_TABS)[number];

// see technical-specification.md §5.9 — "Reports is a single destination that
// contains all three [reports]", switched via tab/carousel, sharing one period
// selector per report (not one global period for the whole screen).
export default function ReportsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('spendingBreakdown');

  const categoriesList = useCategoriesStore((s) => s.categories);
  const fetchCategories = useCategoriesStore((s) => s.fetchAll);
  const setSelectedMonth = useMonthBudgetStore((s) => s.setMonth);

  const preset = useReportsStore((s) => s.preset);
  const startMonth = useReportsStore((s) => s.startMonth);
  const endMonth = useReportsStore((s) => s.endMonth);
  const spendingBreakdown = useReportsStore((s) => s.spendingBreakdown);
  const incomeVsSpending = useReportsStore((s) => s.incomeVsSpending);
  const netWorthTrend = useReportsStore((s) => s.netWorthTrend);
  const setPreset = useReportsStore((s) => s.setPreset);
  const setCustomRange = useReportsStore((s) => s.setCustomRange);
  const refresh = useReportsStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [fetchCategories]),
  );

  useEffect(() => {
    refresh();
  }, [startMonth, endMonth, refresh]);

  const categoriesById = useMemo(
    () => new Map(categoriesList.map((category) => [category.id, category])),
    [categoriesList],
  );

  function handlePressCategory(categoryId: number) {
    // Category Detail (§5.4) is bound to a single selected month, not a range —
    // use the period's end month (the most recent one) as the closest match to
    // "filtered to the selected period" from §5.9.
    setSelectedMonth(endMonth);
    router.push(`/category/${categoryId}`);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row border-b border-gray-200 dark:border-gray-800">
        {REPORT_TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === tab ? 'border-accent' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-medium ${activeTab === tab ? 'text-accent' : 'text-gray-500 dark:text-gray-300'}`}
            >
              {t(`reports.tabs.${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <PeriodSelector
        preset={preset}
        startMonth={startMonth}
        endMonth={endMonth}
        onPresetChange={setPreset}
        onCustomRangeChange={setCustomRange}
      />

      {activeTab === 'spendingBreakdown' && (
        <SpendingBreakdownList
          entries={spendingBreakdown}
          categoriesById={categoriesById}
          onPressCategory={handlePressCategory}
        />
      )}
      {activeTab === 'incomeVsSpending' && <IncomeVsSpendingChart data={incomeVsSpending} />}
      {activeTab === 'netWorth' && <NetWorthTrendChart data={netWorthTrend} />}
    </View>
  );
}
