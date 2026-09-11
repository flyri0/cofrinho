import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCents } from '@/lib/money';
import type { CategoryRow, TransactionRow } from '@/store';

export interface TransactionListItemProps {
  transaction: TransactionRow;
  category: CategoryRow | undefined;
  currency: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleCleared: () => void;
}

// see technical-specification.md §5.7 — row shows category icon, payee, amount
// (color-coded), date, and an uncleared indicator; long-press opens quick actions.
export function TransactionListItem({
  transaction,
  category,
  currency,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleCleared,
}: TransactionListItemProps) {
  const { t, i18n } = useTranslation();
  const isOutflow = transaction.amount < 0;

  function showOptions() {
    Alert.alert(transaction.payee || t('transactions.transferLabel'), undefined, [
      { text: t('transactions.options.edit'), onPress: onEdit },
      { text: t('transactions.options.duplicate'), onPress: onDuplicate },
      {
        text: transaction.cleared
          ? t('transactions.options.markUncleared')
          : t('transactions.options.markCleared'),
        onPress: onToggleCleared,
      },
      {
        text: t('transactions.options.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('transactions.deleteConfirm.title'), undefined, [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('transactions.deleteConfirm.confirm'),
              style: 'destructive',
              onPress: onDelete,
            },
          ]),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={showOptions}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <Text className="w-8 text-center text-lg">
        {transaction.isTransfer ? '↔' : (category?.icon ?? '❓')}
      </Text>
      <View className="flex-1">
        <Text className="text-base text-gray-900">
          {transaction.payee ||
            (transaction.isTransfer ? t('transactions.transferLabel') : category?.name)}
        </Text>
        <Text className="text-xs text-gray-500">
          {transaction.date}
          {!transaction.cleared ? ` · ${t('transactions.options.markCleared')}` : ''}
        </Text>
      </View>
      <Text
        className={`text-base font-medium ${
          transaction.isTransfer ? 'text-gray-500' : isOutflow ? 'text-gray-900' : 'text-green-600'
        }`}
      >
        {formatCents(transaction.amount, currency, i18n.language)}
      </Text>
    </Pressable>
  );
}
