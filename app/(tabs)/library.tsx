import { useState, useMemo, useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCard from "@/components/BookCard";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import { useBooksStore } from "@/store/books";
import type { Book, BookStatus } from "@/types";

const TABS: { label: string; status: BookStatus }[] = [
  { label: "Quiero leer", status: "TBR" },
  { label: "Leyendo", status: "READING" },
  { label: "Leídos", status: "DONE" },
  { label: "Abandonados", status: "DNF" },
];

const EMPTY_ICONS: Record<BookStatus, keyof typeof Ionicons.glyphMap> = {
  TBR: "bookmark-outline",
  READING: "book-outline",
  DONE: "checkmark-circle-outline",
  DNF: "close-circle-outline",
};

const EMPTY_MESSAGES: Record<BookStatus, string> = {
  TBR: "Agregá libros que quieras leer.",
  READING: "Empezá a leer un libro de tu lista.",
  DONE: "Todavía no terminaste ningún libro.",
  DNF: "No hay libros abandonados.",
};

function matchesSearch(book: Book, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    book.title.toLowerCase().includes(q) ||
    book.authors.some((a) => a.toLowerCase().includes(q))
  );
}

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<BookStatus>("TBR");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const books = useBooksStore((s) => s.books);
  const deleteBook = useBooksStore((s) => s.deleteBook);

  const activeFilterCount =
    selectedTags.length + (minRating != null ? 1 : 0);

  const availableTags = useMemo(() => {
    const all = new Set<string>();
    for (const b of books) {
      for (const t of b.tags ?? []) all.add(t);
    }
    return Array.from(all).sort();
  }, [books]);

  const hasAnyFilter = searchQuery.length > 0 || activeFilterCount > 0;

  const filteredBooks = useMemo(
    () =>
      books
        .filter((b) => (hasAnyFilter ? true : b.status === activeTab))
        .filter((b) => matchesSearch(b, searchQuery))
        .filter(
          (b) =>
            selectedTags.length === 0 ||
            selectedTags.some((t) => (b.tags ?? []).includes(t)),
        )
        .filter((b) => minRating == null || (b.rating ?? 0) >= minRating),
    [books, activeTab, searchQuery, selectedTags, minRating, hasAnyFilter],
  );

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedTags([]);
    setMinRating(null);
  }, []);

  // Books for the active tab (no search/filter applied)
  const tabBooks = useMemo(
    () => books.filter((b) => b.status === activeTab),
    [books, activeTab],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: 60 }}>
      {/* Header */}
      <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "bold" }}>Biblioteca</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {activeTab === "TBR" && !hasAnyFilter && (
              <AnimatedPressable
                onPress={() => router.push("/recommendations")}
                haptic="light"
                scaleDown={0.9}
                style={{
                  backgroundColor: "#f0f7ff",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="compass-outline" size={20} color="#007AFF" />
              </AnimatedPressable>
            )}
            <AnimatedPressable
              onPress={() => router.push("/book/add")}
              haptic="medium"
              scaleDown={0.9}
              style={{
                backgroundColor: "#007AFF",
                width: 36,
                height: 36,
                borderRadius: 18,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: -2 }}>+</Text>
            </AnimatedPressable>
          </View>
        </View>

      {/* Search + Filters */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilters((prev) => !prev);
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: showFilters ? "#007AFF" : "#ddd",
              backgroundColor: showFilters ? "#EBF2FF" : "#f9f9f9",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? "#007AFF" : "#666"}
            />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: "#007AFF",
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {showFilters && (
          <View style={{ marginTop: 10 }}>
            <FilterBar
              availableTags={availableTags}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              minRating={minRating}
              onChangeRating={setMinRating}
              onClear={handleClearFilters}
            />
          </View>
        )}
      </View>

      {hasAnyFilter ? (
        <>
          {/* Search results header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
            }}
          >
            <Text style={{ fontSize: 13, color: "#888" }}>
              {filteredBooks.length} resultado{filteredBooks.length !== 1 ? "s" : ""}
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery("");
                handleClearFilters();
                setShowFilters(false);
              }}
            >
              <Text style={{ fontSize: 13, color: "#007AFF", fontWeight: "600" }}>
                Limpiar
              </Text>
            </Pressable>
          </View>

          {/* Search results list */}
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20, gap: 2 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 32 }}>
                <Ionicons name="search-outline" size={48} color="#ccc" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#666", marginBottom: 4, textAlign: "center" }}>
                  Sin resultados
                </Text>
                <Text style={{ color: "#999", textAlign: "center", fontSize: 14 }}>
                  Probá ajustar la búsqueda o los filtros.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <BookCard
                book={item}
                onPress={() => router.push(`/book/${item.id}`)}
                onDelete={() => deleteBook(item.id)}
              />
            )}
          />
        </>
      ) : (
        <>
          {/* Tabs */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 12,
              marginBottom: 12,
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab.status === activeTab;
              return (
                <Pressable
                  key={tab.status}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab.status);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? "#007AFF" : "#e0e0e0",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: isActive ? "700" : "400",
                      color: isActive ? "#007AFF" : "#888",
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Book list (tab view) */}
          <FlatList
            data={tabBooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 32 }}>
                <Ionicons
                  name={EMPTY_ICONS[activeTab]}
                  size={48}
                  color="#ccc"
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#666", marginBottom: 4, textAlign: "center" }}>
                  No hay libros acá
                </Text>
                <Text style={{ color: "#999", textAlign: "center", fontSize: 14 }}>
                  {EMPTY_MESSAGES[activeTab]}
                </Text>
                {activeTab === "TBR" && (
                  <AnimatedPressable
                    onPress={() => router.push("/book/add")}
                    haptic="medium"
                    style={{
                      backgroundColor: "#007AFF",
                      borderRadius: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      marginTop: 16,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                      Agregar libro
                    </Text>
                  </AnimatedPressable>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <BookCard
                book={item}
                onPress={() => router.push(`/book/${item.id}`)}
                onDelete={() => deleteBook(item.id)}
              />
            )}
          />
        </>
      )}
    </View>
  );
}
