import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AnimatedPressable from './AnimatedPressable';
import { useTheme } from '@/lib/theme';
import { useBooksStore } from '@/store/books';
import type { Recommendation } from '@/types';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const books = useBooksStore((s) => s.books);
  const addBook = useBooksStore((s) => s.addBook);
  const colors = useTheme();

  const alreadyInLibrary = books.some(
    (b) =>
      (b.isbn13 && b.isbn13 === recommendation.isbn13) ||
      (b.isbn10 && b.isbn10 === recommendation.isbn10) ||
      b.title.toLowerCase() === recommendation.title.toLowerCase(),
  );

  function handleAdd() {
    addBook({
      title: recommendation.title,
      authors: recommendation.authors,
      coverUrl: recommendation.coverUrl,
      isbn13: recommendation.isbn13,
      isbn10: recommendation.isbn10,
      pageCount: recommendation.pageCount,
      status: 'TBR',
    });
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {recommendation.coverUrl ? (
          <Image
            source={{ uri: recommendation.coverUrl }}
            style={{ width: 56, height: 84, borderRadius: 6 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 56,
              height: 84,
              borderRadius: 6,
              backgroundColor: colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="book" size={24} color={colors.textTertiary} />
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }} numberOfLines={2}>
            {recommendation.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {recommendation.authors.join(', ')}
          </Text>

          {recommendation.reason ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 }}>
              {recommendation.reason}
            </Text>
          ) : null}
        </View>
      </View>

      <AnimatedPressable
        onPress={alreadyInLibrary ? undefined : handleAdd}
        haptic={alreadyInLibrary ? 'none' : 'medium'}
        disabled={alreadyInLibrary}
        style={{
          marginTop: 12,
          backgroundColor: alreadyInLibrary ? colors.borderLight : colors.primary,
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: alreadyInLibrary ? colors.textTertiary : colors.onPrimary,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {alreadyInLibrary ? 'Ya en biblioteca' : 'Agregar a biblioteca'}
        </Text>
      </AnimatedPressable>
    </View>
  );
}
