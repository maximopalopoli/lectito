import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCard from "@/components/BookCard";
import { useBooksStore } from "@/store/books";
import type { BookStatus } from "@/types";

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

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<BookStatus>("TBR");
  const router = useRouter();
  const books = useBooksStore((s) => s.books);
  const deleteBook = useBooksStore((s) => s.deleteBook);

  const filteredBooks = useMemo(
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
          {activeTab === "TBR" && (
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

      {/* Book list */}
      <FlatList
        data={filteredBooks}
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
    </View>
  );
}
