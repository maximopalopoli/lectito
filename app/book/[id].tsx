import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import AnimatedPressable from "@/components/AnimatedPressable";
import { useBooksStore } from "@/store/books";
import { useQuotesStore } from "@/store/quotes";
import { useSessionsStore } from "@/store/sessions";
import type { BookStatus, QuoteColor } from "@/types";

const COLOR_HEX: Record<QuoteColor, string> = {
  yellow: '#FBBF24',
  blue: '#60A5FA',
  green: '#34D399',
  pink: '#F472B6',
  purple: '#A78BFA',
};

const STATUS_LABEL: Record<BookStatus, string> = {
  TBR: "Quiero leer",
  READING: "Leyendo",
  DONE: "Leído",
  DNF: "Abandonado",
};

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const books = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const changeStatus = useBooksStore((s) => s.changeStatus);
  const allSessions = useSessionsStore((s) => s.sessions);
  const allQuotes = useQuotesStore((s) => s.quotes);

  const book = useMemo(() => books.find((b) => b.id === id), [books, id]);
  const sessions = useMemo(() => allSessions.filter((s) => s.bookId === id), [allSessions, id]);
  const quotes = useMemo(
    () =>
      allQuotes
        .filter((q) => q.bookId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allQuotes, id],
  );

  const [pageInput, setPageInput] = useState("");
  const [showPageInput, setShowPageInput] = useState(false);

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Libro no encontrado</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))} style={{ marginTop: 16 }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const progress = book.pageCount > 0 ? book.currentPage / book.pageCount : 0;

  const handleSavePage = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= book.currentPage && page <= book.pageCount) {
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
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))} style={{ padding: 4 }}>
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
              placeholder={`Página actual (${book.currentPage}-${book.pageCount})`}
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

          <ActionButton
            label="Compartir card"
            color="#8B5CF6"
            onPress={() => router.push({ pathname: "/book/share", params: { bookId: book.id } })}
          />
        </View>

        {/* Session history */}
        {sessions.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", fontSize: 15, marginBottom: 10 }}>
              Historial de sesiones
            </Text>
            {sessions
              .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
              .map((session) => (
                <View
                  key={session.id}
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#666" }}>
                      {new Date(session.startedAt).toLocaleDateString()}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600" }}>
                      {session.durationMin} min
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14 }}>
                    {session.pagesRead} páginas leídas
                  </Text>
                  {session.note && (
                    <Text style={{ fontSize: 13, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                      {session.note}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Quotes section */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600", fontSize: 15 }}>
              Citas{quotes.length > 0 ? ` (${quotes.length})` : ""}
            </Text>
            <AnimatedPressable
              onPress={() =>
                router.push({ pathname: "/book/quote-form", params: { bookId: book.id } })
              }
              haptic="light"
            >
              <Text style={{ color: "#007AFF", fontSize: 14, fontWeight: "600" }}>
                + Agregar
              </Text>
            </AnimatedPressable>
          </View>

          {quotes.length === 0 ? (
            <View
              style={{
                backgroundColor: "#f9f9f9",
                borderRadius: 10,
                padding: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{"\u201C\u201D"}</Text>
              <Text style={{ color: "#999", fontSize: 13, textAlign: "center" }}>
                Guarda citas y pasajes memorables de este libro.
              </Text>
            </View>
          ) : (
            <>
              {quotes.slice(0, 3).map((quote) => (
                <Pressable
                  key={quote.id}
                  onPress={() =>
                    router.push({
                      pathname: "/book/quote-form",
                      params: { bookId: book.id, quoteId: quote.id },
                    })
                  }
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: COLOR_HEX[quote.color],
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontStyle: "italic", lineHeight: 20 }}
                    numberOfLines={3}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </Text>
                  {quote.pageNumber != null && (
                    <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                      Pag. {quote.pageNumber}
                    </Text>
                  )}
                </Pressable>
              ))}
              {quotes.length > 3 && (
                <AnimatedPressable
                  onPress={() =>
                    router.push({ pathname: "/book/quotes", params: { bookId: book.id } })
                  }
                  haptic="light"
                  style={{
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#007AFF", fontSize: 14 }}>
                    Ver todas ({quotes.length})
                  </Text>
                </AnimatedPressable>
              )}
            </>
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
    <AnimatedPressable
      onPress={onPress}
      haptic="medium"
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
    </AnimatedPressable>
  );
}
