import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { randomUUID } from "expo-crypto";

import * as DocumentPicker from "expo-document-picker";

import AnimatedPressable from "@/components/AnimatedPressable";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { fetchBookByISBN, searchBooksByText } from "@/lib/openLibrary";
import { searchBooksByText as searchGoogleBooks } from "@/lib/googleBooks";
import { parseEpub } from "@/lib/epubParser";
import { persistEpub } from "@/lib/epubStorage";
import type { BookSearchResult, BookStatus } from "@/types";

const SHELVES: { label: string; status: BookStatus }[] = [
  { label: "Quiero leer", status: "TBR" },
  { label: "Leyendo", status: "READING" },
  { label: "Leído", status: "DONE" },
  { label: "Abandonado", status: "DNF" },
];

function looksLikeISBN(query: string): boolean {
  const normalized = query.replace(/[-\s]/g, "");
  return /^\d{10}(\d{3})?$/.test(normalized);
}

export default function AddBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const addBook = useBooksStore((s) => s.addBook);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [status, setStatus] = useState<BookStatus>("TBR");
  const [showScanner, setShowScanner] = useState(false);
  const [epubUri, setEpubUri] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const trimmed = (overrideQuery ?? query).trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setResults([]);
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

        if (found.length === 0) {
          setError("No se encontraron resultados");
        } else {
          setResults(found);
          if (found.length === 1) {
            setSelected(found[0]);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const handleAdd = () => {
    if (!selected) return;
    addBook({ ...selected, status, epubUri });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleImportEpub = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/epub+zip",
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      setLoading(true);
      setError(null);
      setResults([]);
      setSelected(null);
      setEpubUri(null);

      const asset = result.assets[0];
      const book = await parseEpub(asset.uri);

      // Persist ePub to permanent storage
      const permanentUri = await persistEpub(asset.uri, randomUUID());
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Volver</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.textPrimary, marginBottom: 16 }}>
          Agregar libro
        </Text>

        {/* Search input */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ISBN o título del libro"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              fontSize: 15,
              color: colors.textPrimary,
            }}
          />
          {Platform.OS !== "web" && (
            <Pressable
              onPress={() => setShowScanner(true)}
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>📷</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{
              backgroundColor: loading || !query.trim() ? "#a0c4ff" : colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600" }}>Buscar</Text>
          </Pressable>
        </View>

        {/* Import ePub */}
        <Pressable
          onPress={handleImportEpub}
          disabled={loading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            marginBottom: 16,
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Text style={{ fontSize: 16 }}>📄</Text>
          <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: "500" }}>
            Importar desde ePub
          </Text>
        </Pressable>

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 32 }}
          />
        )}

        {/* Error */}
        {error && (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: colors.danger, fontSize: 15, textAlign: "center" }}>
              {error}
            </Text>
            <Pressable onPress={() => handleSearch()} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.primary, fontSize: 15 }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {/* Results list (when multiple and none selected) */}
        {!loading && !error && results.length > 1 && !selected && (
          <View>
            <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 8 }}>
              {results.length} resultados — elegí uno:
            </Text>
            {results.map((item, index) => (
              <Pressable
                key={`${item.isbn13 ?? item.isbn10 ?? item.title}-${index}`}
                onPress={() => setSelected(item)}
                style={{
                  flexDirection: "row",
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  borderRadius: 8,
                  marginBottom: 8,
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={{ width: 40, height: 60, borderRadius: 4 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 60,
                      borderRadius: 4,
                      backgroundColor: colors.borderLight,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>📖</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}
                    numberOfLines={1}
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
              </Pressable>
            ))}
          </View>
        )}

        {/* Selected book preview */}
        {selected && (
          <View style={{ marginTop: 8 }}>
            {results.length > 1 && (
              <Pressable
                onPress={() => setSelected(null)}
                style={{ marginBottom: 12 }}
              >
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  ← Volver a resultados
                </Text>
              </Pressable>
            )}

            {/* Cover */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              {selected.coverUrl ? (
                <Image
                  source={{ uri: selected.coverUrl }}
                  style={{ width: 140, height: 210, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 140,
                    height: 210,
                    borderRadius: 8,
                    backgroundColor: colors.borderLight,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 48 }}>📖</Text>
                </View>
              )}
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
            {selected.pageCount > 0 && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textTertiary,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {selected.pageCount} páginas
              </Text>
            )}

            {/* Shelf picker */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: colors.textPrimary,
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              Estantería
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {SHELVES.map((shelf) => {
                const isActive = shelf.status === status;
                return (
                  <AnimatedPressable
                    key={shelf.status}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStatus(shelf.status);
                    }}
                    haptic="none"
                    scaleDown={0.95}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: isActive ? colors.primary : colors.background,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isActive ? colors.onPrimary : colors.textPrimary,
                        fontWeight: isActive ? "600" : "400",
                      }}
                    >
                      {shelf.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Add button */}
            <AnimatedPressable
              onPress={handleAdd}
              haptic="none"
              style={{
                backgroundColor: colors.success,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 24,
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
                Agregar a biblioteca
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
