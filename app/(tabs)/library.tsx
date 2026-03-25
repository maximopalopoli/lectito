import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import BookCard from "@/components/BookCard";
import { useBooksStore } from "@/store/books";
import type { BookStatus } from "@/types";

const TABS: { label: string; status: BookStatus }[] = [
  { label: "Quiero leer", status: "TBR" },
  { label: "Leyendo", status: "READING" },
  { label: "Leídos", status: "DONE" },
  { label: "Abandonados", status: "DNF" },
];

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
        <Pressable
          onPress={() => router.push("/book/add")}
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
        </Pressable>
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
              onPress={() => setActiveTab(tab.status)}
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
          <Text style={{ color: "#888", textAlign: "center", marginTop: 60 }}>
            No hay libros en esta estantería.
          </Text>
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
