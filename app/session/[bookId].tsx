import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useBooksStore } from "@/store/books";

type TimerStatus = "RUNNING" | "PAUSED" | "STOPPED";

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function SessionScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const book = useBooksStore((s) => s.books.find((b) => b.id === bookId));

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>("RUNNING");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(new Date().toISOString());

  useEffect(() => {
    // Auto-start timer on mount
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePauseResume = () => {
    if (status === "RUNNING") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setStatus("PAUSED");
    } else if (status === "PAUSED") {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      setStatus("RUNNING");
    }
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setStatus("STOPPED");
    router.back();
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>← Volver</Text>
        </Pressable>
      </View>

      {/* Book info */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 24,
          gap: 12,
        }}
      >
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={{ width: 48, height: 70, borderRadius: 4 }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 70,
              borderRadius: 4,
              backgroundColor: "#e0e0e0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>📖</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 17, fontWeight: "600" }}
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 2 }} numberOfLines={1}>
            {book.authors.join(", ")}
          </Text>
        </View>
      </View>

      {/* Timer */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text
          style={{
            fontSize: 64,
            fontWeight: "200",
            fontVariant: ["tabular-nums"],
            color: status === "PAUSED" ? "#999" : "#000",
          }}
        >
          {formatTime(elapsedSeconds)}
        </Text>
        {status === "PAUSED" && (
          <Text style={{ color: "#999", fontSize: 14, marginTop: 8 }}>
            En pausa
          </Text>
        )}
      </View>

      {/* Controls */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 16,
          paddingHorizontal: 24,
          paddingBottom: 60,
        }}
      >
        <Pressable
          onPress={handlePauseResume}
          style={{
            flex: 1,
            backgroundColor: status === "PAUSED" ? "#34C759" : "#007AFF",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            {status === "PAUSED" ? "Reanudar" : "Pausar"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleStop}
          style={{
            flex: 1,
            backgroundColor: "#FF3B30",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Detener
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
