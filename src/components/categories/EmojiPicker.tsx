import { Pressable, Text, View } from 'react-native';

// A small curated set covering common budgeting categories — not exhaustive,
// just enough variety for §5.4's "Change icon (emoji grid)".
export const CATEGORY_ICON_OPTIONS = [
  '🏠',
  '⚡',
  '🚰',
  '🌐',
  '📱',
  '🛒',
  '🚌',
  '💊',
  '🍔',
  '🎬',
  '📺',
  '🛍️',
  '🛟',
  '✈️',
  '💳',
  '🎁',
  '☕',
  '👕',
  '🎓',
  '💰',
  '🐾',
  '🏋️',
  '📚',
  '🎮',
  '🐶',
  '🚗',
  '🏥',
  '🎨',
  '🎵',
  '🧾',
] as const;

export interface EmojiPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {CATEGORY_ICON_OPTIONS.map((icon) => (
        <Pressable
          key={icon}
          onPress={() => onChange(icon)}
          className={`h-11 w-11 items-center justify-center rounded-lg ${
            value === icon ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          <Text className="text-xl">{icon}</Text>
        </Pressable>
      ))}
    </View>
  );
}
