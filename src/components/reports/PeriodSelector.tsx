import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { REPORT_PERIOD_PRESETS, type ReportPeriodPreset } from '@/lib/reports';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface PeriodSelectorProps {
  preset: ReportPeriodPreset;
  startMonth: string;
  endMonth: string;
  onPresetChange: (preset: ReportPeriodPreset) => void;
  onCustomRangeChange: (startMonth: string, endMonth: string) => void;
}

// see technical-specification.md §5.9 — "each report has its own period selector
// (current month, last 3/6/12 months, custom range)".
export function PeriodSelector({
  preset,
  startMonth,
  endMonth,
  onPresetChange,
  onCustomRangeChange,
}: PeriodSelectorProps) {
  const { t } = useTranslation();
  // Local drafts so the user can freely type an incomplete month ('2026-0')
  // without each keystroke pushing a malformed range up into the store. Kept in
  // sync with the store's range during render (not an effect, per React's
  // guidance on adjusting state from props) whenever it changes from outside
  // this component — e.g. switching a preset then back to 'custom'.
  const [startDraft, setStartDraft] = useState(startMonth);
  const [endDraft, setEndDraft] = useState(endMonth);
  const [syncedStartMonth, setSyncedStartMonth] = useState(startMonth);
  const [syncedEndMonth, setSyncedEndMonth] = useState(endMonth);

  if (startMonth !== syncedStartMonth) {
    setSyncedStartMonth(startMonth);
    setStartDraft(startMonth);
  }
  if (endMonth !== syncedEndMonth) {
    setSyncedEndMonth(endMonth);
    setEndDraft(endMonth);
  }

  function commitStart(text: string) {
    setStartDraft(text);
    if (MONTH_PATTERN.test(text) && MONTH_PATTERN.test(endDraft))
      onCustomRangeChange(text, endDraft);
  }

  function commitEnd(text: string) {
    setEndDraft(text);
    if (MONTH_PATTERN.test(startDraft) && MONTH_PATTERN.test(text))
      onCustomRangeChange(startDraft, text);
  }

  return (
    <View className="gap-2 border-b border-gray-200 p-3">
      <View className="flex-row flex-wrap gap-2">
        {REPORT_PERIOD_PRESETS.map((option) => (
          <Pressable
            key={option}
            onPress={() => onPresetChange(option)}
            className={`rounded-full px-3 py-1.5 ${preset === option ? 'bg-blue-600' : 'bg-gray-100'}`}
          >
            <Text
              className={`text-sm font-medium ${preset === option ? 'text-white' : 'text-gray-700'}`}
            >
              {t(`reports.period.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {preset === 'custom' && (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={startDraft}
            onChangeText={commitStart}
            placeholder="YYYY-MM"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <Text className="text-sm text-gray-400">{t('reports.period.customRangeSeparator')}</Text>
          <TextInput
            value={endDraft}
            onChangeText={commitEnd}
            placeholder="YYYY-MM"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </View>
      )}
    </View>
  );
}
