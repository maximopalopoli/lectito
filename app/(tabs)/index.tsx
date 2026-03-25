import { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getStreak, getTodayStats } from "@/lib/stats";
import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";

export default function HomeScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);

  const todayStats = useMemo(() => getTodayStats(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);

  const currentBook = books.find((b) => b.status === "READING");

  const progress =
    currentBook && currentBook.pageCount > 0
      ? Math.round((currentBook.currentPage / currentBook.pageCount) * 100)
      : 0;

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

      {/* Current book */}
      {currentBook ? (
        <>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#666",
              marginBottom: 12,
            }}
          >
            Leyendo ahora
          </Text>
          <Pressable
            onPress={() => router.push(`/book/${currentBook.id}`)}
            style={{
              backgroundColor: "#f5f5f5",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              marginBottom: 16,
            }}
          >
            {currentBook.coverUrl ? (
              <Image
                source={{ uri: currentBook.coverUrl }}
                style={{ width: 60, height: 88, borderRadius: 6 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 60,
                  height: 88,
                  borderRadius: 6,
                  backgroundColor: "#ddd",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="book" size={28} color="#999" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14, justifyContent: "center" }}>
              <Text
                style={{ fontSize: 17, fontWeight: "600" }}
                numberOfLines={2}
              >
                {currentBook.title}
              </Text>
              <Text
                style={{ fontSize: 13, color: "#666", marginTop: 2 }}
                numberOfLines={1}
              >
                {currentBook.authors.join(", ")}
              </Text>
              {currentBook.pageCount > 0 && (
                <>
                  <View
                    style={{
                      height: 4,
                      backgroundColor: "#ddd",
                      borderRadius: 2,
                      marginTop: 10,
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
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {currentBook.currentPage}/{currentBook.pageCount} páginas ({progress}%)
                  </Text>
                </>
              )}
            </View>
          </Pressable>

          {/* Start session button */}
          <Pressable
            onPress={() => router.push(`/session/${currentBook.id}`)}
            style={{
              backgroundColor: "#007AFF",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>
              Iniciar sesión
            </Text>
          </Pressable>
        </>
      ) : (
        /* Empty state — no book currently being read */
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
          <Pressable
            onPress={() => router.push("/book/add")}
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
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
