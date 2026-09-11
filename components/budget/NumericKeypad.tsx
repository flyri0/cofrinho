import { Pressable, Text, View } from 'react-native';

export interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function NumericKeypad({ onDigit, onBackspace }: NumericKeypadProps) {
  return (
    <View className="flex-row flex-wrap">
      {KEYS.map((key, index) => {
        if (key === '') {
          return <View key={`spacer-${index}`} className="w-1/3 p-1" />;
        }

        const isBackspace = key === '⌫';

        return (
          <View key={key} className="w-1/3 p-1">
            <Pressable
              onPress={() => (isBackspace ? onBackspace() : onDigit(key))}
              className="items-center justify-center rounded-lg bg-gray-100 py-4"
            >
              <Text className="text-xl font-semibold text-gray-900">{key}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
