import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import BookCard from "@/components/BookCard";
import { useBooksStore } from "@/store/books";
import type { Book, BookStatus } from "@/types";

const TABS: { label: string; status: BookStatus }[] = [
  { label: "Quiero leer", status: "TBR" },
  { label: "Leyendo", status: "READING" },
  { label: "Leídos", status: "DONE" },
  { label: "Abandonados", status: "DNF" },
];

const TEST_BOOKS: Omit<Book, "id" | "addedAt" | "currentPage">[] = [
  { title: "Cien años de soledad", authors: ["Gabriel García Márquez"], coverUrl: null, isbn13: null, isbn10: null, pageCount: 417, status: "TBR" },
  { title: "Rayuela", authors: ["Julio Cortázar"], coverUrl: null, isbn13: null, isbn10: null, pageCount: 600, status: "READING" },
  { title: "Ficciones", authors: ["Jorge Luis Borges"], coverUrl: null, isbn13: null, isbn10: null, pageCount: 174, status: "DONE" },
  { title: "2666", authors: ["Roberto Bolaño"], coverUrl: null, isbn13: null, isbn10: null, pageCount: 1120, status: "DNF" },
];

let testIndex = 0;

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<BookStatus>("TBR");
  const books = useBooksStore((s) => s.books);
  const addBook = useBooksStore((s) => s.addBook);
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
          onPress={() => {
            addBook(TEST_BOOKS[testIndex % TEST_BOOKS.length]);
            testIndex++;
          }}
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
            onDelete={() => deleteBook(item.id)}
          />
        )}
      />
    </View>
  );
}
