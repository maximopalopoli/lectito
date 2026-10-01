import { useMemo } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AnimatedPressable from '@/components/AnimatedPressable';
import CircleIconButton from '@/components/CircleIconButton';
import ScreenHeader from '@/components/ScreenHeader';
import { useTheme } from '@/lib/theme';
import { useBooksStore } from '@/store/books';
import { useQuotesStore } from '@/store/quotes';
import type { QuoteColor } from '@/types';

const COLOR_HEX: Record<QuoteColor, string> = {
  yellow: '#FBBF24',
  blue: '#60A5FA',
  green: '#34D399',
  pink: '#F472B6',
  purple: '#A78BFA',
};

export default function QuotesListScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const colors = useTheme();

  const books = useBooksStore((s) => s.books);
  const allQuotes = useQuotesStore((s) => s.quotes);
  const deleteQuote = useQuotesStore((s) => s.deleteQuote);

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);
  const quotes = useMemo(
    () =>
      allQuotes
        .filter((q) => q.bookId === bookId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allQuotes, bookId],
  );

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar cita', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteQuote(id) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader
        title="Citas"
        right={
          <CircleIconButton
            icon="add"
            label="Agregar cita"
            onPress={() => router.push({ pathname: '/book/quote-form', params: { bookId } })}
          />
        }
      />
      {book && (
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, color: colors.textSecondary, paddingHorizontal: 24, marginTop: -4, marginBottom: 16 }}
        >
          {book.title}
        </Text>
      )}

      <View style={{ paddingHorizontal: 24 }}>
        {quotes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{"\u201C\u201D"}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center' }}>
              Todavía no hay citas para este libro.{'\n'}Tocá + para agregar la primera.
            </Text>
          </View>
        ) : (
          quotes.map((quote) => (
            <View
              key={quote.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                borderLeftWidth: 4,
                borderLeftColor: COLOR_HEX[quote.color],
              }}
            >
              <Text style={{ fontSize: 15, fontStyle: 'italic', lineHeight: 22, color: colors.textPrimary }}>
                &ldquo;{quote.text}&rdquo;
              </Text>
              {quote.pageNumber != null && (
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 6 }}>
                  Pag. {quote.pageNumber}
                </Text>
              )}
              {quote.note && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>
                  {quote.note}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                  {new Date(quote.createdAt).toLocaleDateString()}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <AnimatedPressable
                    onPress={() =>
                      router.push({
                        pathname: '/book/quote-form',
                        params: { bookId, quoteId: quote.id },
                      })
                    }
                    haptic="light"
                  >
                    <Text style={{ color: colors.primary, fontSize: 13 }}>Editar</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => handleDelete(quote.id)}
                    haptic="medium"
                  >
                    <Text style={{ color: colors.danger, fontSize: 13 }}>Eliminar</Text>
                  </AnimatedPressable>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
