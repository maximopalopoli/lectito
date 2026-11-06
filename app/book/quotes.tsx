import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AnimatedPressable from '@/components/AnimatedPressable';
import CircleIconButton from '@/components/CircleIconButton';
import ScreenHeader from '@/components/ScreenHeader';
import { fontSize, fontWeight, radius, spacing, useTheme } from '@/lib/theme';
import { deleteQuoteWithUndo } from '@/lib/undoableActions';
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

/** Las citas más largas que esto se muestran recortadas, con "Ver más". */
const LONG_QUOTE_CHARS = 280;
const COLLAPSED_LINES = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    // El año solo cuando no es el actual: "30 oct", "12 mar 2025".
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export default function QuotesListScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const colors = useTheme();

  const books = useBooksStore((s) => s.books);
  const allQuotes = useQuotesStore((s) => s.quotes);

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);
  const quotes = useMemo(
    () =>
      allQuotes
        .filter((q) => q.bookId === bookId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allQuotes, bookId],
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addQuote = () => router.push({ pathname: '/book/quote-form', params: { bookId } });
  const handleDelete = (id: string) => deleteQuoteWithUndo(id);

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
            onPress={addQuote}
          />
        }
      />
      {book && (
        <Text
          numberOfLines={1}
          style={{ fontSize: fontSize.md, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginTop: -4, marginBottom: spacing.lg }}
        >
          {book.title}
        </Text>
      )}

      <View style={{ paddingHorizontal: spacing.xl }}>
        {quotes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.lg }}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.icon} />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginTop: spacing.md }}>
              Todavía no hay citas
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 }}>
              {book?.epubUri
                ? 'Guardá las frases que quieras recordar. También podés seleccionar texto mientras leés el ePub.'
                : 'Guardá las frases que quieras recordar.'}
            </Text>
            <AnimatedPressable
              onPress={addQuote}
              haptic="light"
              accessibilityRole="button"
              style={{
                marginTop: spacing.lg,
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                minHeight: 48,
                paddingHorizontal: spacing.xl,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                Agregar cita
              </Text>
            </AnimatedPressable>
          </View>
        ) : (
          quotes.map((quote) => {
            const isLong = quote.text.length > LONG_QUOTE_CHARS;
            const isExpanded = expanded.has(quote.id);
            const meta = [quote.pageNumber != null ? `Pág. ${quote.pageNumber}` : null, formatDate(quote.createdAt)]
              .filter(Boolean)
              .join(' · ');
            return (
              <View
                key={quote.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  paddingTop: 14,
                  paddingLeft: 14,
                  paddingRight: spacing.xs,
                  paddingBottom: spacing.xs,
                  marginBottom: spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: COLOR_HEX[quote.color],
                }}
              >
                <Text
                  numberOfLines={isLong && !isExpanded ? COLLAPSED_LINES : undefined}
                  style={{ fontSize: fontSize.base, fontStyle: 'italic', lineHeight: 22, color: colors.textPrimary, paddingRight: 10 }}
                >
                  &ldquo;{quote.text}&rdquo;
                </Text>
                {isLong && (
                  <Pressable
                    onPress={() => toggleExpanded(quote.id)}
                    accessibilityRole="button"
                    style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                      {isExpanded ? 'Ver menos' : 'Ver más'}
                    </Text>
                  </Pressable>
                )}
                {quote.note && (
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 6, paddingRight: 10, lineHeight: 18 }}>
                    {quote.note}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                  <Text style={{ flex: 1, fontSize: fontSize.xs, color: colors.textTertiary }}>{meta}</Text>
                  <AnimatedPressable
                    onPress={() =>
                      router.push({
                        pathname: '/book/quote-form',
                        params: { bookId, quoteId: quote.id },
                      })
                    }
                    haptic="light"
                    accessibilityRole="button"
                    accessibilityLabel="Editar cita"
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => handleDelete(quote.id)}
                    haptic="medium"
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar cita"
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </AnimatedPressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
