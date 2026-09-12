import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTransactionsStore } from '@/store';

export interface PayeeInputProps {
  value: string;
  onChangeValue: (payee: string) => void;
}

// see technical-specification.md §5.8 — "free-text field with autocomplete
// based on previously used payees."
export function PayeeInput({ value, onChangeValue }: PayeeInputProps) {
  const { t } = useTranslation();
  const fetchPayeeSuggestions = useTransactionsStore((s) => s.fetchPayeeSuggestions);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function handleChangeText(text: string) {
    onChangeValue(text);
    setSuggestions(text.trim() ? await fetchPayeeSuggestions(text) : []);
  }

  function selectSuggestion(payee: string) {
    onChangeValue(payee);
    setSuggestions([]);
  }

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        placeholder={t('transactionForm.payeePlaceholder')}
        className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100"
      />
      {suggestions.length > 0 && (
        <View className="mt-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion}
              onPress={() => selectSuggestion(suggestion)}
              className={`px-3 py-2 ${index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}
            >
              <Text className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
