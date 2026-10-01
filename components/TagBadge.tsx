import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/lib/theme';

interface TagBadgeProps {
  label: string;
  onRemove?: () => void;
}

export default function TagBadge({ label, onRemove }: TagBadgeProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.tagBg,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.tagText }}>{label}</Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Quitar etiqueta ${label}`}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 12 }}
          style={{ marginLeft: 4 }}
        >
          <Text style={{ fontSize: 13, color: colors.tagText, fontWeight: '600' }}>
            x
          </Text>
        </Pressable>
      )}
    </View>
  );
}
