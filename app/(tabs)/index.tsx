import { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import { getStreak, getTodayStats } from "@/lib/stats";
import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";

export default function HomeScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);

  const todayStats = useMemo(() => getTodayStats(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);

  const readingBooks = books.filter((b) => b.status === "READING");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 24 }}>
        Hola!
      </Text>

      {/* Today summary */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: "#666",
          marginBottom: 12,
        }}
      >
        Resumen de hoy
      </Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#007AFF" }}>
            {todayStats.minutes}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            minutos
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#007AFF" }}>
            {todayStats.pages}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            páginas
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#FF9500" }}>
            {streak}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            racha
          </Text>
        </View>
      </View>

      {/* Continue reading */}
      {readingBooks.length > 0 ? (
        <>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#666",
              marginBottom: 12,
            }}
          >
            Continuar leyendo
          </Text>
          {readingBooks.map((book) => {
            const progress =
              book.pageCount > 0
                ? Math.round((book.currentPage / book.pageCount) * 100)
                : 0;
            return (
              <View key={book.id} style={{ marginBottom: 12 }}>
                <AnimatedPressable
                  onPress={() => router.push(`/book/${book.id}`)}
                  haptic="light"
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {book.coverUrl ? (
                    <Image
                      source={{ uri: book.coverUrl }}
                      style={{ width: 50, height: 74, borderRadius: 6 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 50,
                        height: 74,
                        borderRadius: 6,
                        backgroundColor: "#ddd",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="book" size={24} color="#999" />
                    </View>
                  )}
                  <View
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: 16, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {book.title}
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: "#666", marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {book.authors.join(", ")}
                    </Text>
                    {book.pageCount > 0 && (
                      <>
                        <View
                          style={{
                            height: 4,
                            backgroundColor: "#ddd",
                            borderRadius: 2,
                            marginTop: 8,
                          }}
                        >
                          <View
                            style={{
                              height: 4,
                              backgroundColor: "#007AFF",
                              borderRadius: 2,
                              width: `${progress}%`,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#999",
                            marginTop: 3,
                          }}
                        >
                          {book.currentPage}/{book.pageCount} ({progress}%)
                        </Text>
                      </>
                    )}
                  </View>
                  <AnimatedPressable
                    onPress={() => router.push(`/session/${book.id}`)}
                    haptic="medium"
                    scaleDown={0.9}
                    style={{
                      backgroundColor: "#007AFF",
                      borderRadius: 10,
                      width: 44,
                      height: 44,
                      justifyContent: "center",
                      alignItems: "center",
                      marginLeft: 8,
                    }}
                  >
                    <Ionicons name="play" size={22} color="#fff" />
                  </AnimatedPressable>
                </AnimatedPressable>
              </View>
            );
          })}
        </>
      ) : (
        <View
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Ionicons
            name="book-outline"
            size={48}
            color="#ccc"
            style={{ marginBottom: 12 }}
          />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#666",
              marginBottom: 4,
            }}
          >
            No estás leyendo nada
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#999",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Marcá un libro como "Leyendo" para empezar a registrar sesiones.
          </Text>
          <AnimatedPressable
            onPress={() => router.push("/book/add")}
            haptic="medium"
            style={{
              backgroundColor: "#007AFF",
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
              Agregar libro
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}
