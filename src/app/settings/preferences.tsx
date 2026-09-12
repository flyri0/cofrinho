import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  CURRENCY_SYMBOL_POSITIONS,
  DECIMAL_SEPARATORS,
  type CurrencySymbolPosition,
  type DecimalSeparator,
} from '@/db/schema';
import { useSettingsStore } from '@/store';

// see technical-specification.md §6.4. Ships pt-BR and en; adding a language
// is just a new resource file + an entry here, not a code change elsewhere.
const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const;

const MIN_FIRST_DAY = 1;
const MAX_FIRST_DAY = 28;

export default function PreferencesScreen() {
  const { t, i18n } = useTranslation();
  const currencySymbol = useSettingsStore((s) => s.currencySymbol);
  const currencySymbolPosition = useSettingsStore((s) => s.currencySymbolPosition);
  const decimalSeparator = useSettingsStore((s) => s.decimalSeparator);
  const firstDayOfMonth = useSettingsStore((s) => s.firstDayOfMonth);
  const locale = useSettingsStore((s) => s.locale);
  const setCurrencySymbol = useSettingsStore((s) => s.setCurrencySymbol);
  const setCurrencySymbolPosition = useSettingsStore((s) => s.setCurrencySymbolPosition);
  const setDecimalSeparator = useSettingsStore((s) => s.setDecimalSeparator);
  const setFirstDayOfMonth = useSettingsStore((s) => s.setFirstDayOfMonth);
  const setLocale = useSettingsStore((s) => s.setLocale);

  function changeLanguage(code: string) {
    setLocale(code);
    i18n.changeLanguage(code);
  }

  function adjustFirstDay(delta: number) {
    const next = Math.min(MAX_FIRST_DAY, Math.max(MIN_FIRST_DAY, firstDayOfMonth + delta));
    if (next !== firstDayOfMonth) setFirstDayOfMonth(next);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.preferences.currencySymbol')}
        </Text>
        <TextInput
          value={currencySymbol}
          onChangeText={setCurrencySymbol}
          maxLength={3}
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.preferences.symbolPosition')}
        </Text>
        <View className="flex-row gap-2">
          {CURRENCY_SYMBOL_POSITIONS.map((position: CurrencySymbolPosition) => (
            <Pressable
              key={position}
              onPress={() => setCurrencySymbolPosition(position)}
              className={`flex-1 items-center rounded-lg py-2.5 ${
                currencySymbolPosition === position ? 'bg-accent' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  currencySymbolPosition === position
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t(`settings.preferences.symbolPositions.${position}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.preferences.decimalSeparator')}
        </Text>
        <View className="flex-row gap-2">
          {DECIMAL_SEPARATORS.map((separator: DecimalSeparator) => (
            <Pressable
              key={separator}
              onPress={() => setDecimalSeparator(separator)}
              className={`flex-1 items-center rounded-lg py-2.5 ${
                decimalSeparator === separator ? 'bg-accent' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  decimalSeparator === separator ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {separator === ','
                  ? t('settings.preferences.comma')
                  : t('settings.preferences.period')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.preferences.monthStartDay')}
        </Text>
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => adjustFirstDay(-1)}
            disabled={firstDayOfMonth <= MIN_FIRST_DAY}
            className="h-9 w-9 items-center justify-center rounded-lg bg-surface"
          >
            <Text className="text-lg text-gray-700 dark:text-gray-300">−</Text>
          </Pressable>
          <Text className="w-8 text-center text-base font-medium text-gray-900 dark:text-gray-100">
            {firstDayOfMonth}
          </Text>
          <Pressable
            onPress={() => adjustFirstDay(1)}
            disabled={firstDayOfMonth >= MAX_FIRST_DAY}
            className="h-9 w-9 items-center justify-center rounded-lg bg-surface"
          >
            <Text className="text-lg text-gray-700 dark:text-gray-300">+</Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.preferences.language')}
        </Text>
        {SUPPORTED_LANGUAGES.map((code) => (
          <Pressable
            key={code}
            onPress={() => changeLanguage(code)}
            className="flex-row items-center justify-between rounded-lg bg-surface px-3 py-3"
          >
            <Text className="text-base text-gray-900 dark:text-gray-100">
              {t(`settings.preferences.languages.${code}`)}
            </Text>
            {locale === code && <Text className="text-accent">✓</Text>}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
