import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { digitsToCents, formatCents } from '@/lib/money';

export interface MoneyInputProps {
  value: number; // cents, signed
  onChangeValue: (cents: number) => void;
  currency?: string;
  allowNegative?: boolean;
  editable?: boolean;
  testID?: string;
}

// "Calculator style" input — see src/lib/money/moneyInput.ts for why.
export function MoneyInput({
  value,
  onChangeValue,
  currency = 'BRL',
  allowNegative = true,
  editable = true,
  testID,
}: MoneyInputProps) {
  const { i18n } = useTranslation();
  const isNegative = allowNegative && value < 0;

  function handleChangeText(text: string) {
    const cents = digitsToCents(text);
    onChangeValue(isNegative ? -cents : cents);
  }

  function toggleSign() {
    if (!allowNegative) return;
    onChangeValue(-value);
  }

  return (
    <View className="flex-row items-center gap-2">
      {allowNegative && (
        <Pressable
          onPress={toggleSign}
          disabled={!editable}
          testID={testID ? `${testID}-sign-toggle` : undefined}
          className={`h-11 w-11 items-center justify-center rounded-lg ${
            isNegative ? 'bg-red-100' : 'bg-green-100'
          }`}
        >
          <Text
            className={`text-lg font-semibold ${isNegative ? 'text-red-600' : 'text-green-600'}`}
          >
            {isNegative ? '−' : '+'}
          </Text>
        </Pressable>
      )}
      <TextInput
        editable={editable}
        keyboardType="number-pad"
        value={formatCents(Math.abs(value), currency, i18n.language)}
        onChangeText={handleChangeText}
        testID={testID}
        className={`flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base ${
          editable ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'
        }`}
      />
    </View>
  );
}
