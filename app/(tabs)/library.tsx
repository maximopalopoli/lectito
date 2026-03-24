import { Pressable, Text, View } from "react-native";

import { useBooksStore } from "@/store/books";

export default function LibraryScreen() {
  const books = useBooksStore((s) => s.books);
  const addBook = useBooksStore((s) => s.addBook);
  const deleteBook = useBooksStore((s) => s.deleteBook);

  return (
    <View style={{ flex: 1, padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Biblioteca
      </Text>

      <Pressable
        onPress={() =>
          addBook({
            title: "Cien años de soledad",
            authors: ["Gabriel García Márquez"],
            coverUrl: null,
            isbn13: "9780060883287",
            isbn10: null,
            pageCount: 417,
            status: "TBR",
          })
        }
        style={{
          backgroundColor: "#007AFF",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
          + Agregar libro de prueba
        </Text>
      </Pressable>

      {books.length === 0 ? (
        <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
          No hay libros aún. Toca el botón para agregar uno.
        </Text>
      ) : (
        books.map((book) => (
          <View
            key={book.id}
            style={{
              padding: 12,
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
              marginBottom: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{book.title}</Text>
              <Text style={{ color: "#666", fontSize: 13 }}>
                {book.authors.join(", ")} · {book.status} · {book.pageCount} pp
              </Text>
            </View>
            <Pressable onPress={() => deleteBook(book.id)}>
              <Text style={{ color: "red", fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}
