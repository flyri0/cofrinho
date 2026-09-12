import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TRANSACTION_TYPES, type TransactionType } from '@/lib/transactions';

export interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

// see technical-specification.md §5.8 — "compact dropdown... switching types
// reorganizes the fields below." A row of chips serves the same purpose.
export function TransactionTypeSelector({ value, onChange }: TransactionTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-2">
      {TRANSACTION_TYPES.map((type) => (
        <Pressable
          key={type}
          onPress={() => onChange(type)}
          className={`rounded-full px-3 py-2 ${value === type ? 'bg-accent' : 'bg-surface'}`}
        >
          <Text
            className={`text-sm font-medium ${value === type ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {t(`transactionTypes.${type}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
