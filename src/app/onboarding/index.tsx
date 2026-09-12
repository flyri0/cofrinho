import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t('onboarding.welcome.title')}
      </Text>
      <Text className="text-center text-base text-gray-600 dark:text-gray-300">
        {t('onboarding.welcome.description')}
      </Text>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/account/new',
            params: { redirectTo: '/onboarding/categories' },
          })
        }
        className="mt-4 items-center rounded-lg bg-accent px-6 py-3"
      >
        <Text className="text-base font-semibold text-white">{t('onboarding.welcome.cta')}</Text>
      </Pressable>
    </View>
  );
}
