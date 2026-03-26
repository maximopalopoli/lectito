import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AnimatedPressable from '@/components/AnimatedPressable';
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
    Alert.alert('Eliminar cita', 'Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteQuote(id) },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>← Volver</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '600' }}>
          Citas{book ? ` — ${book.title}` : ''}
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/book/quote-form', params: { bookId } })
          }
          style={{ padding: 4 }}
        >
          <Text style={{ color: '#007AFF', fontSize: 22, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        {quotes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{"\u201C\u201D"}</Text>
            <Text style={{ color: '#888', fontSize: 15, textAlign: 'center' }}>
              Aun no hay citas para este libro.{'\n'}Agrega tu primera cita.
            </Text>
          </View>
        ) : (
          quotes.map((quote) => (
            <View
              key={quote.id}
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                borderLeftWidth: 4,
                borderLeftColor: COLOR_HEX[quote.color],
              }}
            >
              <Text style={{ fontSize: 15, fontStyle: 'italic', lineHeight: 22 }}>
                &ldquo;{quote.text}&rdquo;
              </Text>
              {quote.pageNumber != null && (
                <Text style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                  Pag. {quote.pageNumber}
                </Text>
              )}
              {quote.note && (
                <Text style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
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
                <Text style={{ fontSize: 11, color: '#bbb' }}>
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
                    <Text style={{ color: '#007AFF', fontSize: 13 }}>Editar</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => handleDelete(quote.id)}
                    haptic="medium"
                  >
                    <Text style={{ color: '#FF3B30', fontSize: 13 }}>Eliminar</Text>
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
