import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AnimatedPressable from '@/components/AnimatedPressable';
import CircleIconButton from '@/components/CircleIconButton';
import ScreenHeader from '@/components/ScreenHeader';
import RecommendationCard from '@/components/RecommendationCard';
import { useTheme } from '@/lib/theme';
import { fetchSubjectsForBook, fetchBooksBySubject, searchBooksByAuthor } from '@/lib/openLibrary';
import { useBooksStore } from '@/store/books';
import { useRecommendationsStore } from '@/store/recommendations';
import type { Book, Recommendation, RecommendationCandidate } from '@/types';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_SELECTION = 3;

type ScreenState = 'selection' | 'loading' | 'results' | 'error';

function isCacheValid(
  cache: { generatedAt: string; basedOnBookIds: string[]; recommendations: unknown[] } | null,
  selectedIds: string[],
): boolean {
  if (!cache) return false;
  const age = Date.now() - new Date(cache.generatedAt).getTime();
  if (age > CACHE_TTL_MS) return false;
  if (cache.recommendations.length <= PAGE_SIZE) return false;
  if (cache.basedOnBookIds.length !== selectedIds.length) return false;
  return selectedIds.every((id) => cache.basedOnBookIds.includes(id));
}

const PAGE_SIZE = 10;

function buildRecs(
  subjectCandidates: RecommendationCandidate[],
  authorCandidates: RecommendationCandidate[],
): Recommendation[] {
  const authorRecs: Recommendation[] = authorCandidates.map((c) => ({
    ...c,
    score: 100,
    reason: `Del mismo autor que uno de tus libros seleccionados.`,
  }));

  const authorKeys = new Set(authorCandidates.map((c) => c.openLibraryKey));
  const subjectRecs: Recommendation[] = subjectCandidates
    .filter((c) => !authorKeys.has(c.openLibraryKey))
    .map((c) => ({
      ...c,
      score: c.subjects.length * 10,
      reason: `Basado en tu interés en ${c.subjects[0] ?? 'este género'}.`,
    }))
    .sort((a, b) => b.score - a.score);

  return [...authorRecs, ...subjectRecs];
}

export default function RecommendationsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const books = useBooksStore((s) => s.books);
  const { cache, setCache } = useRecommendationsStore();

  const eligibleBooks = books.filter(
    (b) => (b.status === 'DONE' || b.status === 'READING') && (b.isbn13 || b.isbn10),
  );

  const [screenState, setScreenState] = useState<ScreenState>('selection');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Analizando tu biblioteca...');

  const runningRef = useRef(false);

  const runPipeline = useCallback(
    async (selected: Book[], force = false) => {
      if (runningRef.current) return;
      runningRef.current = true;

      const selectedIds = selected.map((b) => b.id);

      try {
        if (!force && isCacheValid(cache, selectedIds)) {
          setRecommendations(cache!.recommendations);
          setVisibleCount(PAGE_SIZE);
          setScreenState('results');
          return;
        }

        setScreenState('loading');
        setLoadingMessage('Analizando tu selección...');

        // Step 1: fetch subjects
        const subjectResults = await Promise.allSettled(
          selected.map((b) => fetchSubjectsForBook((b.isbn13 ?? b.isbn10)!)),
        );

        const subjectFreq = new Map<string, number>();
        subjectResults.forEach((r) => {
          if (r.status === 'fulfilled') {
            r.value.forEach((s) => subjectFreq.set(s, (subjectFreq.get(s) ?? 0) + 1));
          }
        });

        if (subjectFreq.size === 0) {
          setErrorMessage(
            'No se pudieron obtener datos de los libros seleccionados. Asegurate de que tengan ISBN.',
          );
          setScreenState('error');
          return;
        }

        const topSubjects = [...subjectFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([s]) => s);

        setLoadingMessage('Buscando libros para vos...');

        // Step 2: fetch candidates per subject
        const candidateResults = await Promise.allSettled(
          topSubjects.map((s) => fetchBooksBySubject(s, 20)),
        );

        // Step 3: fetch by authors of selected books (top 3 most frequent)
        const authorFreq = new Map<string, number>();
        selected.forEach((b) =>
          b.authors.forEach((a) => authorFreq.set(a, (authorFreq.get(a) ?? 0) + 1)),
        );
        const topAuthors = [...authorFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([a]) => a);
        const authorResults = await Promise.allSettled(
          topAuthors.map((a) => searchBooksByAuthor(a, 15)),
        );

        const libraryIsbn13 = new Set(books.map((b) => b.isbn13).filter(Boolean));
        const libraryIsbn10 = new Set(books.map((b) => b.isbn10).filter(Boolean));
        const libraryTitles = new Set(books.map((b) => b.title.toLowerCase()));

        function isInLibrary(c: RecommendationCandidate) {
          return (
            (c.isbn13 && libraryIsbn13.has(c.isbn13)) ||
            (c.isbn10 && libraryIsbn10.has(c.isbn10)) ||
            libraryTitles.has(c.title.toLowerCase())
          );
        }

        // Build subject candidates
        const subjectSeenKeys = new Set<string>();
        const subjectCandidates: RecommendationCandidate[] = [];
        candidateResults.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            r.value.forEach((c) => {
              if (subjectSeenKeys.has(c.openLibraryKey) || isInLibrary(c)) return;
              const existing = subjectCandidates.find((x) => x.openLibraryKey === c.openLibraryKey);
              if (existing) {
                existing.subjects = [...new Set([...existing.subjects, topSubjects[i]])];
              } else {
                subjectSeenKeys.add(c.openLibraryKey);
                subjectCandidates.push({ ...c, subjects: [topSubjects[i]] });
              }
            });
          }
        });

        // Build author candidates — only filtered against library, not against subject candidates
        // (buildRecs handles dedup between both lists)
        const authorSeenKeys = new Set<string>();
        const authorCandidates: RecommendationCandidate[] = [];
        authorResults.forEach((r) => {
          if (r.status === 'fulfilled') {
            r.value.forEach((c) => {
              if (authorSeenKeys.has(c.openLibraryKey) || isInLibrary(c)) return;
              authorSeenKeys.add(c.openLibraryKey);
              authorCandidates.push(c);
            });
          }
        });

        if (subjectCandidates.length === 0 && authorCandidates.length === 0) {
          setErrorMessage('No encontramos recomendaciones. ¡Probá seleccionando otros libros!');
          setScreenState('error');
          return;
        }

        const finalRecs = buildRecs(subjectCandidates, authorCandidates);
        const newCache = {
          recommendations: finalRecs,
          generatedAt: new Date().toISOString(),
          basedOnBookIds: selectedIds,
        };
        setCache(newCache);
        setRecommendations(finalRecs);
        setVisibleCount(PAGE_SIZE);
        setScreenState('results');
      } catch {
        setErrorMessage('Algo salió mal. Revisá tu conexión e intentá de nuevo.');
        setScreenState('error');
      } finally {
        runningRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, cache],
  );

  function toggleBook(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSearch() {
    const selected = eligibleBooks.filter((b) => selectedIds.has(b.id));
    runPipeline(selected);
  }

  const title =
    screenState === 'selection'
      ? 'Descubrir libros'
      : screenState === 'loading'
        ? 'Buscando...'
        : 'Recomendaciones';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={title}
        onBack={() => {
          if (screenState === 'results' || screenState === 'error') {
            setScreenState('selection');
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/library');
          }
        }}
        right={
          screenState === 'results' ? (
            <CircleIconButton
              icon="refresh"
              label="Buscar otras recomendaciones"
              onPress={() => {
                const selected = eligibleBooks.filter((b) => selectedIds.has(b.id));
                runPipeline(selected, true);
              }}
            />
          ) : undefined
        }
      />

      {/* Selection */}
      {screenState === 'selection' && (
        <>
          {eligibleBooks.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 32,
                gap: 12,
              }}
            >
              <Ionicons name="book-outline" size={48} color={colors.icon} />
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                Necesitás al menos {MIN_SELECTION} libros leídos o en curso con ISBN.
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                Elegí los libros en base a los cuales querés que se generen las recomendaciones. Para
                armarlas se consultan en Open Library el ISBN y los autores de esos libros.
              </Text>
              <FlatList
                data={eligibleBooks}
                keyExtractor={(b) => b.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 + insets.bottom }}
                renderItem={({ item }) => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <AnimatedPressable
                      onPress={() => toggleBook(item.id)}
                      haptic="light"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${item.title}, ${item.authors.join(', ')}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: selected ? colors.surfaceTint : colors.surface,
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 8,
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary : 'transparent',
                      }}
                    >
                      {item.coverUrl ? (
                        <Image
                          source={{ uri: item.coverUrl }}
                          style={{ width: 40, height: 58, borderRadius: 4 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 40,
                            height: 58,
                            borderRadius: 4,
                            backgroundColor: colors.border,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="book" size={18} color={colors.textTertiary} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          {item.authors.join(', ')}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={selected ? colors.primary : colors.icon}
                        style={{ marginLeft: 8 }}
                      />
                    </AnimatedPressable>
                  );
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 16,
                  paddingBottom: 16 + insets.bottom,
                  backgroundColor: colors.background,
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}
              >
                {selectedIds.size < MIN_SELECTION && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: 'center',
                      marginBottom: 8,
                    }}
                  >
                    {selectedIds.size === 0
                      ? `Elegí al menos ${MIN_SELECTION} libros`
                      : `Elegí ${MIN_SELECTION - selectedIds.size} más`}
                  </Text>
                )}
                <AnimatedPressable
                  onPress={handleSearch}
                  haptic="medium"
                  disabled={selectedIds.size < MIN_SELECTION}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: selectedIds.size < MIN_SELECTION }}
                  style={{
                    backgroundColor: colors.primary,
                    opacity: selectedIds.size < MIN_SELECTION ? 0.4 : 1,
                    borderRadius: 12,
                    minHeight: 50,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '600' }}>
                    Buscar recomendaciones ({selectedIds.size})
                  </Text>
                </AnimatedPressable>
              </View>
            </>
          )}
        </>
      )}

      {/* Loading */}
      {screenState === 'loading' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>{loadingMessage}</Text>
        </View>
      )}

      {/* Results */}
      {screenState === 'results' && (
        <FlatList
          data={recommendations.slice(0, visibleCount)}
          keyExtractor={(item) => item.openLibraryKey}
          renderItem={({ item }) => <RecommendationCard recommendation={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 + insets.bottom }}
          ListHeaderComponent={
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 12 }}>
              Basado en {selectedIds.size} libros seleccionados
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 40 }}>
              No hay recomendaciones disponibles.
            </Text>
          }
          ListFooterComponent={
            visibleCount < recommendations.length ? (
              <AnimatedPressable
                accessibilityRole="button"
                onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}
                haptic="light"
                style={{
                  borderWidth: 1,
                  borderColor: colors.primary,
                  borderRadius: 10,
                  minHeight: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>
                  Cargar más
                </Text>
              </AnimatedPressable>
            ) : (
              <Text style={{ color: colors.textTertiary, textAlign: 'center', fontSize: 13, marginTop: 12 }}>
                No hay más recomendaciones
              </Text>
            )
          }
        />
      )}

      {/* Error */}
      {screenState === 'error' && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
            gap: 16,
          }}
        >
          <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            {errorMessage}
          </Text>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setScreenState('selection')}
            haptic="medium"
            style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: 28,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: '600' }}>
              Cambiar selección
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}
