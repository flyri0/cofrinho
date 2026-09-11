import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold">{t('app.name')}</Text>
      <Text className="mt-2 text-base text-gray-500">{t('tabs.home')}</Text>
    </View>
  );
}
