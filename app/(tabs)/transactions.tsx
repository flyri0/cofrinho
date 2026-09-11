import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TransactionsScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-base text-gray-500">{t('tabs.transactions')}</Text>
    </View>
  );
}
