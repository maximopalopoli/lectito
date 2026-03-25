import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useBooksStore } from "@/store/books";
import { fetchBookByISBN, searchBooksByText } from "@/lib/openLibrary";
import { searchBooksByText as searchGoogleBooks } from "@/lib/googleBooks";
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
  const addBook = useBooksStore((s) => s.addBook);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [status, setStatus] = useState<BookStatus>("TBR");

  const handleSearch = async () => {
    const trimmed = query.trim();
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
  };

  const handleAdd = () => {
    if (!selected) return;
    addBook({ ...selected, status });
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>← Volver</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>
          Agregar libro
        </Text>

        {/* Search input */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ISBN o título del libro"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              backgroundColor: loading || !query.trim() ? "#a0c4ff" : "#007AFF",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Buscar</Text>
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 32 }}
          />
        )}

        {/* Error */}
        {error && (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: "#FF3B30", fontSize: 15, textAlign: "center" }}>
              {error}
            </Text>
            <Pressable onPress={handleSearch} style={{ marginTop: 12 }}>
              <Text style={{ color: "#007AFF", fontSize: 15 }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {/* Results list (when multiple and none selected) */}
        {!loading && !error && results.length > 1 && !selected && (
          <View>
            <Text style={{ fontSize: 15, color: "#666", marginBottom: 8 }}>
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
                  borderColor: "#e0e0e0",
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
                      backgroundColor: "#e0e0e0",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>📖</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 15, fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#666", marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.authors.join(", ")}
                  </Text>
                  {item.pageCount > 0 && (
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
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
                <Text style={{ color: "#007AFF", fontSize: 14 }}>
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
                    backgroundColor: "#e0e0e0",
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
                textAlign: "center",
              }}
            >
              {selected.title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#666",
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
                  color: "#999",
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
                  <Pressable
                    key={shelf.status}
                    onPress={() => setStatus(shelf.status)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isActive ? "#007AFF" : "#ddd",
                      backgroundColor: isActive ? "#007AFF" : "#fff",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: isActive ? "#fff" : "#333",
                        fontWeight: isActive ? "600" : "400",
                      }}
                    >
                      {shelf.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Add button */}
            <Pressable
              onPress={handleAdd}
              style={{
                backgroundColor: "#34C759",
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 24,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Agregar a biblioteca
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
