import { Pressable, Text, View } from 'react-native';

interface TagBadgeProps {
  label: string;
  onRemove?: () => void;
}

export default function TagBadge({ label, onRemove }: TagBadgeProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F0FE',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 13, color: '#1A73E8' }}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={6} style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: 13, color: '#1A73E8', fontWeight: '600' }}>
            x
          </Text>
        </Pressable>
      )}
    </View>
  );
}
