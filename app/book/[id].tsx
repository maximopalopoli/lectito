import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useBooksStore } from "@/store/books";
import type { BookStatus } from "@/types";

const STATUS_LABEL: Record<BookStatus, string> = {
  TBR: "Quiero leer",
  READING: "Leyendo",
  DONE: "Leído",
  DNF: "Abandonado",
};

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const book = useBooksStore((s) => s.books.find((b) => b.id === id));
  const updateBook = useBooksStore((s) => s.updateBook);
  const changeStatus = useBooksStore((s) => s.changeStatus);

  const [pageInput, setPageInput] = useState("");
  const [showPageInput, setShowPageInput] = useState(false);

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Libro no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const progress = book.pageCount > 0 ? book.currentPage / book.pageCount : 0;

  const handleSavePage = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 0 && page <= book.pageCount) {
      updateBook(book.id, { currentPage: page });
      setPageInput("");
      setShowPageInput(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 40 }}
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

      {/* Cover */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
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
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", textAlign: "center" }}>
          {book.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#666",
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {book.authors.join(", ")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          <InfoChip label="Estado" value={STATUS_LABEL[book.status]} />
          <InfoChip label="Páginas" value={String(book.pageCount)} />
          {book.isbn13 && <InfoChip label="ISBN" value={book.isbn13} />}
        </View>

        <Text style={{ color: "#999", fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Agregado el {new Date(book.addedAt).toLocaleDateString()}
        </Text>

        {/* Progress */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 8 }}>
            Progreso
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: "#e8e8e8",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: "#007AFF",
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
            Página {book.currentPage} de {book.pageCount} (
            {Math.round(progress * 100)}%)
          </Text>
        </View>

        {/* Update progress input */}
        {showPageInput && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              gap: 8,
            }}
          >
            <TextInput
              value={pageInput}
              onChangeText={setPageInput}
              placeholder={`Página actual (0-${book.pageCount})`}
              keyboardType="number-pad"
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
              onPress={handleSavePage}
              style={{
                backgroundColor: "#007AFF",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Guardar</Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={{ marginTop: 24, gap: 10 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 4 }}>
            Acciones
          </Text>

          {book.status === "TBR" && (
            <ActionButton
              label="Empezar a leer"
              color="#34C759"
              onPress={() => changeStatus(book.id, "READING")}
            />
          )}

          {book.status === "READING" && (
            <>
              <ActionButton
                label="Iniciar sesión de lectura"
                color="#007AFF"
                onPress={() => router.push(`/session/${book.id}`)}
              />
              <ActionButton
                label="Actualizar progreso"
                color="#007AFF"
                onPress={() => setShowPageInput(!showPageInput)}
              />
              <ActionButton
                label="Marcar como leído"
                color="#34C759"
                onPress={() => {
                  updateBook(book.id, { currentPage: book.pageCount });
                  changeStatus(book.id, "DONE");
                }}
              />
              <ActionButton
                label="Abandonar"
                color="#FF3B30"
                onPress={() => changeStatus(book.id, "DNF")}
              />
            </>
          )}

          {book.status === "DONE" && (
            <ActionButton
              label="Volver a leer"
              color="#007AFF"
              onPress={() => {
                updateBook(book.id, { currentPage: 0 });
                changeStatus(book.id, "READING");
              }}
            />
          )}

          {book.status === "DNF" && (
            <ActionButton
              label="Reintentar"
              color="#007AFF"
              onPress={() => {
                updateBook(book.id, { currentPage: 0 });
                changeStatus(book.id, "READING");
              }}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: color,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
