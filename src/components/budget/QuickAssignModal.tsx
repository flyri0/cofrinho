import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { digitsToCents, formatCents } from '@/lib/money';

import { NumericKeypad } from './NumericKeypad';

export interface QuickAssignModalProps {
  visible: boolean;
  categoryName: string;
  initialCents: number;
  targetCents: number | null;
  onClose: () => void;
  onSave: (cents: number) => void;
}

// see technical-specification.md §5.3 — "quick assign-amount editor: dedicated
// numeric keypad with quick action shortcuts above it (Zero out, Fill target)"
export function QuickAssignModal({
  visible,
  categoryName,
  initialCents,
  targetCents,
  onClose,
  onSave,
}: QuickAssignModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Mounting only while visible means each open starts fresh from the current
            initialCents, without needing an effect to resync state from props. */}
        {visible && (
          <QuickAssignModalContent
            categoryName={categoryName}
            initialCents={initialCents}
            targetCents={targetCents}
            onSave={(cents) => {
              onSave(cents);
              onClose();
            }}
          />
        )}
      </Pressable>
    </Modal>
  );
}

interface QuickAssignModalContentProps {
  categoryName: string;
  initialCents: number;
  targetCents: number | null;
  onSave: (cents: number) => void;
}

function QuickAssignModalContent({
  categoryName,
  initialCents,
  targetCents,
  onSave,
}: QuickAssignModalContentProps) {
  const { t, i18n } = useTranslation();
  const [digits, setDigits] = useState(String(Math.max(0, initialCents)));

  const cents = digitsToCents(digits);

  return (
    <Pressable className="rounded-t-2xl bg-background p-4" onPress={(e) => e.stopPropagation()}>
      <Text className="text-center text-sm text-gray-500 dark:text-gray-300">{categoryName}</Text>
      <Text className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
        {formatCents(cents, 'BRL', i18n.language)}
      </Text>

      <View className="mb-4 flex-row gap-2">
        <Pressable
          onPress={() => setDigits('0')}
          className="flex-1 items-center rounded-lg bg-surface py-2"
        >
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('budget.quickAssign.zeroOut')}
          </Text>
        </Pressable>
        {targetCents !== null && (
          <Pressable
            onPress={() => setDigits(String(Math.max(0, targetCents)))}
            className="flex-1 items-center rounded-lg bg-surface py-2"
          >
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('budget.quickAssign.fillTarget')}
            </Text>
          </Pressable>
        )}
      </View>

      <NumericKeypad
        onDigit={(digit) => setDigits((prev) => (prev === '0' ? digit : prev + digit))}
        onBackspace={() => setDigits((prev) => prev.slice(0, -1))}
      />

      <Pressable
        onPress={() => onSave(cents)}
        className="mt-4 items-center rounded-lg bg-accent py-3"
      >
        <Text className="text-base font-semibold text-white">{t('accountForm.save')}</Text>
      </Pressable>
    </Pressable>
  );
}
