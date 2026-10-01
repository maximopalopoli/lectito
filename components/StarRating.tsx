import { Pressable, View, Text } from 'react-native';

import { useTheme } from '@/lib/theme';

interface StarRatingProps {
  rating: number | null;
  onRate?: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

export default function StarRating({
  rating,
  onRate,
  size = 28,
  readonly = false,
}: StarRatingProps) {
  const colors = useTheme();
  if (readonly) {
    // Read as one value ("4 de 5 estrellas") instead of five separate symbols.
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={rating != null ? `${rating} de 5 estrellas` : 'Sin calificación'}
        style={{ flexDirection: 'row', gap: 4 }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={{ fontSize: size, color: rating != null && star <= rating ? '#F59E0B' : colors.icon }}>
            {rating != null && star <= rating ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating != null && star <= rating;
        return (
          <Pressable
            key={star}
            onPress={() => onRate?.(star)}
            accessibilityRole="radio"
            accessibilityLabel={star === 1 ? '1 estrella' : `${star} estrellas`}
            accessibilityState={{ selected: rating === star }}
            hitSlop={4}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              style={{
                fontSize: size,
                color: filled ? '#F59E0B' : colors.icon,
              }}
            >
              {filled ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
