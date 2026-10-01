import { useState, useMemo, useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCard from "@/components/BookCard";
import SearchBar from "@/components/SearchBar";
import FilterBar from "@/components/FilterBar";
import { spacing, useTheme } from "@/lib/theme";
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
  const [activeTab, setActiveTab] = useState<BookStatus>(() =>
    useBooksStore.getState().books.some((b) => b.status === "READING") ? "READING" : "TBR",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const books = useBooksStore((s) => s.books);

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

  const shelfCounts = useMemo(() => {
    const counts: Record<BookStatus, number> = { TBR: 0, READING: 0, DONE: 0, DNF: 0 };
    for (const b of books) counts[b.status] += 1;
    return counts;
  }, [books]);

  // Books for the active tab (no search/filter applied)
  const tabBooks = useMemo(
    () => books.filter((b) => b.status === activeTab),
    [books, activeTab],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
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
          <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.textPrimary }}>Biblioteca</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {activeTab === "TBR" && !hasAnyFilter && (
              <AnimatedPressable
                onPress={() => router.push("/recommendations")}
                accessibilityRole="button"
                accessibilityLabel="Explorar recomendaciones"
                haptic="light"
                scaleDown={0.9}
                style={{
                  backgroundColor: colors.surfaceTint,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="compass-outline" size={20} color={colors.primary} />
              </AnimatedPressable>
            )}
            <AnimatedPressable
              onPress={() => router.push("/book/add")}
              accessibilityRole="button"
              accessibilityLabel="Agregar libro"
              haptic="medium"
              scaleDown={0.9}
              style={{
                backgroundColor: colors.primary,
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.onPrimary, fontSize: 20, fontWeight: "bold", marginTop: -2 }}>+</Text>
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
            accessibilityRole="button"
            accessibilityLabel="Filtros de biblioteca"
            accessibilityState={{ expanded: showFilters }}
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilters((prev) => !prev);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: showFilters ? colors.primary : colors.border,
              backgroundColor: showFilters ? colors.primaryTint : colors.surfaceAlt,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? colors.primary : colors.textSecondary}
            />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: colors.onPrimary, fontSize: 10, fontWeight: "700" }}>
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

      <Pressable
        onPress={() => router.push("/lists")}
        accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 9, gap: 8 }}
      >
        <Ionicons name="albums-outline" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Mis listas</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>

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
              borderBottomColor: colors.divider,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {filteredBooks.length} resultado{filteredBooks.length !== 1 ? "s" : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda y filtros"
              onPress={() => {
                setSearchQuery("");
                handleClearFilters();
                setShowFilters(false);
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
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
                <Ionicons name="search-outline" size={48} color={colors.icon} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginBottom: 4, textAlign: "center" }}>
                  Sin resultados
                </Text>
                <Text style={{ color: colors.textTertiary, textAlign: "center", fontSize: 14 }}>
                  Probá ajustar la búsqueda o los filtros.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <BookCard
                book={item}
                onPress={() => router.push(`/book/${item.id}`)}
              />
            )}
          />
        </>
      ) : (
        <>
          {/* Tabs */}
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: "row",
              marginHorizontal: 20,
              marginBottom: 12,
              padding: 3,
              borderRadius: 10,
              backgroundColor: colors.surface,
            }}
          >
            {TABS.map((tab) => {
              const isActive = tab.status === activeTab;
              const count = shelfCounts[tab.status];
              return (
                <Pressable
                  key={tab.status}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${tab.label}, ${count} libro${count !== 1 ? "s" : ""}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab.status);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    paddingHorizontal: 2,
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isActive ? colors.surfaceAlt : "transparent",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? colors.textPrimary : colors.textMuted,
                    }}
                  >
                    {tab.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      marginTop: 1,
                      fontWeight: "600",
                      color: isActive ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {count}
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
                  color={colors.icon}
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginBottom: 4, textAlign: "center" }}>
                  No hay libros acá
                </Text>
                <Text style={{ color: colors.textTertiary, textAlign: "center", fontSize: 14 }}>
                  {EMPTY_MESSAGES[activeTab]}
                </Text>
                {activeTab === "TBR" && (
                  <AnimatedPressable
                    onPress={() => router.push("/book/add")}
                    haptic="medium"
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      marginTop: 16,
                    }}
                  >
                    <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: "600" }}>
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
                showStatus={false}
              />
            )}
          />
        </>
      )}
    </View>
  );
}
