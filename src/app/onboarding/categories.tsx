import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import {
  allSuggestedCategoryKeys,
  buildSelectedSuggestions,
  SUGGESTED_CATEGORY_GROUPS,
} from '@/lib/categories';
import { useCategoriesStore } from '@/store';

export default function OnboardingCategoriesScreen() {
  const { t } = useTranslation();
  const createSuggestedCategories = useCategoriesStore((s) => s.createSuggestedCategories);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(allSuggestedCategoryKeys()),
  );

  function toggle(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleContinue() {
    const builtGroups = buildSelectedSuggestions(
      SUGGESTED_CATEGORY_GROUPS,
      selectedKeys,
      (key) => t(`suggestedCategoryGroups.${key}`),
      (key) => t(`suggestedCategoryNames.${key}`),
    );
    if (builtGroups.length > 0) {
      await createSuggestedCategories(builtGroups);
    }
    router.replace('/');
  }

  return (
    <View className="flex-1 bg-background">
      <View className="gap-1 border-b border-gray-200 dark:border-gray-800 p-4">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('onboarding.categories.title')}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          {t('onboarding.categories.description')}
        </Text>
      </View>

      <ScrollView contentContainerClassName="gap-5 p-4">
        {SUGGESTED_CATEGORY_GROUPS.map((group) => (
          <View key={group.key} className="gap-1">
            <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {t(`suggestedCategoryGroups.${group.key}`)}
            </Text>
            {group.categories.map((category) => {
              const checked = selectedKeys.has(category.key);
              return (
                <Pressable
                  key={category.key}
                  onPress={() => toggle(category.key)}
                  className="flex-row items-center gap-3 py-2"
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded border ${
                      checked ? 'border-accent bg-accent' : 'border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    {checked && <Text className="text-xs text-white">✓</Text>}
                  </View>
                  <Text className="text-lg">{category.icon}</Text>
                  <Text className="text-base text-gray-900 dark:text-gray-100">
                    {t(`suggestedCategoryNames.${category.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View className="border-t border-gray-200 dark:border-gray-800 p-4">
        <Pressable onPress={handleContinue} className="items-center rounded-lg bg-accent py-3">
          <Text className="text-base font-semibold text-white">
            {t('onboarding.categories.cta')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
