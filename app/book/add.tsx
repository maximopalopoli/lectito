import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { randomUUID } from "expo-crypto";

import { pickDocument } from "@/lib/pickDocument";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import BarcodeScanner from "@/components/BarcodeScanner";
import BookCover from "@/components/BookCover";
import ScreenHeader from "@/components/ScreenHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { radius, spacing, useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { fetchBookByISBN, searchBooksByText } from "@/lib/openLibrary";
import { searchBooksByText as searchGoogleBooks } from "@/lib/googleBooks";
import { LIVE_SEARCH_DELAY_MS, looksLikeISBN, shouldLiveSearch } from "@/lib/bookSearch";
import { parseEpub } from "@/lib/epubParser";
import { persistEpub } from "@/lib/epubStorage";
import type { BookSearchResult, BookStatus } from "@/types";

const SHELVES: { label: string; value: BookStatus }[] = [
  { label: "Quiero leer", value: "TBR" },
  { label: "Leyendo", value: "READING" },
  { label: "Leído", value: "DONE" },
  { label: "Abandonado", value: "DNF" },
];

export default function AddBookScreen() {
  const router = useRouter();
  const colors = useTheme();
  const addBook = useBooksStore((s) => s.addBook);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [status, setStatus] = useState<BookStatus>("TBR");
  const [showScanner, setShowScanner] = useState(false);
  const [epubUri, setEpubUri] = useState<string | null>(null);
  // Cada búsqueda toma un número; solo la última puede escribir resultados (las respuestas llegan desordenadas).
  const requestRef = useRef(0);
  const lastSearchedRef = useRef("");

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
      if (!trimmed) return;
      const requestId = ++requestRef.current;
      const isCurrent = () => requestId === requestRef.current;
      lastSearchedRef.current = trimmed;

      setLoading(true);
      setError(null);
      setNotFound(false);
      setSelected(null);

      try {
        let found: BookSearchResult[] = [];

        if (looksLikeISBN(trimmed)) {
          try {
            const book = await fetchBookByISBN(trimmed);
            found = [book];
          } catch {
            // Fallback to text search
            found = await searchBooksByText(trimmed);
          }
        } else {
          // Open Library text search, Google Books as last resort
          found = await searchBooksByText(trimmed);
          if (found.length === 0) {
            found = await searchGoogleBooks(trimmed);
          }
        }

        if (!isCurrent()) return;
        setResults(found);
        if (found.length === 0) {
          setNotFound(true);
        } else {
          if (found.length === 1) {
            setSelected(found[0]);
          }
        }
      } catch (e) {
        if (!isCurrent()) return;
        setResults([]);
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [query],
  );

  // Buscar mientras se escribe, con una pausa para no disparar una consulta por tecla.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Al borrar la búsqueda se vuelve al estado inicial (y se descarta una búsqueda en curso).
      if (lastSearchedRef.current) {
        requestRef.current++;
        lastSearchedRef.current = "";
        setLoading(false);
        setError(null);
        setNotFound(false);
        setResults([]);
        setSelected(null);
      }
      return;
    }
    if (!shouldLiveSearch(trimmed) || trimmed === lastSearchedRef.current) return;
    const timer = setTimeout(() => void handleSearch(trimmed), LIVE_SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleAdd = () => {
    if (!selected) return;
    addBook({ ...selected, status, epubUri });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goBack();
  };

  const handleImportEpub = useCallback(async () => {
    try {
      const pickedUri = await pickDocument("application/epub+zip");
      if (!pickedUri) return;

      requestRef.current++;
      setLoading(true);
      setError(null);
      setNotFound(false);
      setResults([]);
      setSelected(null);
      setEpubUri(null);

      const book = await parseEpub(pickedUri);

      // Persist ePub to permanent storage
      const permanentUri = await persistEpub(pickedUri, randomUUID());
      setEpubUri(permanentUri);

      setResults([book]);
      setSelected(book);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el ePub");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBarcodeScan = useCallback(
    (isbn: string) => {
      setShowScanner(false);
      setQuery(isbn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleSearch(isbn);
    },
    [handleSearch],
  );

  if (showScanner) {
    return (
      <BarcodeScanner
        onScanned={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  const canSearch = !loading && query.trim().length > 0;
  const idle = !loading && !error && !notFound && results.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Agregar libro" onBack={goBack} />

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* Search */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              paddingLeft: spacing.md,
              minHeight: 48,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Título, autor o ISBN"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              autoFocus={Platform.OS !== "web"}
              onSubmitEditing={() => handleSearch()}
              accessibilityLabel="Buscar libro"
              style={{
                flex: 1,
                minWidth: 0,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
            {loading && results.length > 0 && (
              <ActivityIndicator size="small" color={colors.textTertiary} style={{ marginHorizontal: spacing.xs }} />
            )}
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Borrar búsqueda"
                style={{ width: 40, height: 44, justifyContent: "center", alignItems: "center" }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
          <AnimatedPressable
            onPress={() => handleSearch()}
            disabled={!canSearch}
            haptic="light"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSearch }}
            style={{
              backgroundColor: colors.primary,
              opacity: canSearch ? 1 : 0.4,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.lg,
              justifyContent: "center",
              minHeight: 48,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>Buscar</Text>
          </AnimatedPressable>
        </View>

        {/* Other ways to add (only before any search) */}
        {idle && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.md }}>
              Otras formas de agregar
            </Text>
            {Platform.OS !== "web" && (
              <OptionCard
                icon="barcode-outline"
                title="Escanear código de barras"
                subtitle="Apuntá la cámara al ISBN de la contratapa"
                onPress={() => setShowScanner(true)}
              />
            )}
            <OptionCard
              icon="document-text-outline"
              title="Importar un ePub"
              subtitle="Usa los datos del archivo y lo leés en la app"
              onPress={handleImportEpub}
            />
          </View>
        )}

        {/* Loading */}
        {loading && results.length === 0 && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 48 }}
          />
        )}

        {/* Not found */}
        {!loading && notFound && (
          <View style={{ alignItems: "center", marginTop: 48, paddingHorizontal: spacing.lg }}>
            <Ionicons name="search-outline" size={40} color={colors.icon} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.md }}>
              Sin resultados
            </Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: "center", marginTop: spacing.xs }}>
              Probá con otro título, solo el apellido del autor o el ISBN.
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={{ alignItems: "center", marginTop: 48, paddingHorizontal: spacing.lg }}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.icon} />
            <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: "center", marginTop: spacing.md }}>
              {error}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => handleSearch()} style={{ marginTop: spacing.md, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {/* Results list (when multiple and none selected) */}
        {!error && results.length > 1 && !selected && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.md }}>
              {results.length} resultados
            </Text>
            {results.map((item, index) => (
              <AnimatedPressable
                key={`${item.isbn13 ?? item.isbn10 ?? item.title}-${index}`}
                onPress={() => setSelected(item)}
                haptic="light"
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.authors.join(", ")}`}
                style={{
                  flexDirection: "row",
                  padding: spacing.md,
                  backgroundColor: colors.surface,
                  borderRadius: radius.xl,
                  marginBottom: spacing.sm,
                  gap: spacing.md,
                  alignItems: "center",
                }}
              >
                <BookCover uri={item.coverUrl} width={40} height={60} radius={4} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.authors.join(", ")}
                  </Text>
                  {item.pageCount > 0 && (
                    <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                      {item.pageCount} páginas
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            ))}
          </View>
        )}

        {/* Selected book preview */}
        {selected && (
          <View style={{ marginTop: spacing.lg }}>
            {results.length > 1 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(null)}
                style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginBottom: spacing.xs }}
              >
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  Ver todos los resultados
                </Text>
              </Pressable>
            )}

            {/* Cover */}
            <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
              <BookCover uri={selected.coverUrl} width={140} height={210} radius={8} />
            </View>

            {/* Info */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.textPrimary,
                textAlign: "center",
              }}
            >
              {selected.title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {selected.authors.join(", ")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textTertiary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {[
                selected.pageCount > 0 ? `${selected.pageCount} páginas` : null,
                epubUri ? "ePub adjunto" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            {/* Shelf picker */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: colors.textSecondary,
                marginTop: spacing.xl,
                marginBottom: spacing.sm,
              }}
            >
              ¿En qué estantería?
            </Text>
            <SegmentedControl options={SHELVES} value={status} onChange={setStatus} accessibilityLabel="Estantería" />

            {/* Add button */}
            <AnimatedPressable
              onPress={handleAdd}
              haptic="none"
              accessibilityRole="button"
              style={{
                backgroundColor: colors.primary,
                minHeight: 50,
                borderRadius: radius.lg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.sm,
                marginTop: spacing.xl,
              }}
            >
              <Ionicons name="add" size={20} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
                Agregar a la biblioteca
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primaryTint,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </AnimatedPressable>
  );
}
