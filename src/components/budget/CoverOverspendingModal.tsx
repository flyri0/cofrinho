import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCents } from '@/lib/money';

export interface CoverOverspendingCandidate {
  id: number;
  name: string;
  available: number;
}

export interface CoverOverspendingModalProps {
  visible: boolean;
  candidates: CoverOverspendingCandidate[];
  onClose: () => void;
  onSelect: (sourceCategoryId: number) => void;
}

// see technical-specification.md §5.3 — "Cover with leftover from another category"
export function CoverOverspendingModal({
  visible,
  candidates,
  onClose,
  onSelect,
}: CoverOverspendingModalProps) {
  const { t, i18n } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="max-h-96 rounded-t-2xl bg-background p-4"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="mb-3 text-center text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('budget.coverModal.title')}
          </Text>
          {candidates.length === 0 ? (
            <Text className="py-6 text-center text-sm text-gray-500 dark:text-gray-300">
              {t('budget.coverModal.empty')}
            </Text>
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View className="h-px bg-surface" />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item.id)}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-base text-gray-900 dark:text-gray-100">{item.name}</Text>
                  <Text className="text-base font-medium text-success">
                    {formatCents(item.available, 'BRL', i18n.language)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
