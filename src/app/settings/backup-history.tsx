import { useEffect } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/lib/backup';
import { useBackupStore } from '@/store';

// see technical-specification.md §6.3 — "History: opens a simple list from the
// backup_log table, showing date, status (success/error icon), and trigger
// (manual/automatic). Tapping an item with an error shows error_message."
export default function BackupHistoryScreen() {
  const { t, i18n } = useTranslation();
  const history = useBackupStore((s) => s.history);
  const fetchHistory = useBackupStore((s) => s.fetchHistory);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (history.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-center text-base text-gray-500">
          {t('backup.history.emptyState')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={history}
      keyExtractor={(entry) => String(entry.id)}
      ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
      renderItem={({ item }) => {
        const isSuccess = item.status === 'success';
        return (
          <Pressable
            onPress={() => {
              if (!isSuccess && item.errorMessage)
                Alert.alert(t('backup.history.errorTitle'), item.errorMessage);
            }}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-gray-900">
                {formatDateTime(item.timestamp, i18n.language)}
              </Text>
              <Text className="text-sm text-gray-500">
                {t(`backup.history.trigger.${item.trigger}`)}
              </Text>
            </View>
            <Text className={`text-lg ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
              {isSuccess ? '✓' : '✕'}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
