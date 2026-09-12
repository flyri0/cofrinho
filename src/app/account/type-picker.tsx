import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { ACCOUNT_TYPE_GROUPS } from '@/lib/accounts';
import { useAccountFormDraftStore } from '@/store/accountFormDraftStore';

export default function AccountTypePickerScreen() {
  const { t } = useTranslation();
  const selectedType = useAccountFormDraftStore((s) => s.type);
  const setField = useAccountFormDraftStore((s) => s.setField);

  function selectType(type: (typeof ACCOUNT_TYPE_GROUPS)[number]['types'][number]) {
    setField('type', type);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      {ACCOUNT_TYPE_GROUPS.map((group) => (
        <View key={group.kind} className="gap-2">
          <View>
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t(`accountGroups.${group.kind}.title`)}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t(`accountGroups.${group.kind}.description`)}
            </Text>
          </View>
          <View className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {group.types.map((type, index) => (
              <Pressable
                key={type}
                onPress={() => selectType(type)}
                className={`flex-row items-center justify-between px-3 py-3 ${
                  index > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                } ${selectedType === type ? 'bg-accent/10' : 'bg-background'}`}
              >
                <Text className="text-base text-gray-900 dark:text-gray-100">
                  {t(`accountTypes.${type}`)}
                </Text>
                {selectedType === type && <Text className="text-accent">✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
