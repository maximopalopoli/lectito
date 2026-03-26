import { Pressable, View, Text } from 'react-native';

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
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating != null && star <= rating;
        return (
          <Pressable
            key={star}
            onPress={() => {
              if (!readonly && onRate) onRate(star);
            }}
            disabled={readonly}
            hitSlop={4}
          >
            <Text
              style={{
                fontSize: size,
                color: filled ? '#F59E0B' : '#D1D5DB',
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
