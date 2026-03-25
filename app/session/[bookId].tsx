import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";

import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";

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
  const books = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const addSession = useSessionsStore.getState().addSession;

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>("RUNNING");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(new Date().toISOString());

  useKeepAwake();

  const [pageInput, setPageInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
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
  };

  const handleSave = () => {
    if (!book) return;
    const page = parseInt(pageInput, 10);
    if (isNaN(page) || page < book.currentPage || page > book.pageCount) return;

    const endedAt = new Date().toISOString();
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    const pagesRead = page - book.currentPage;

    addSession({
      bookId: book.id,
      startedAt: startedAtRef.current,
      endedAt,
      durationMin,
      pagesRead,
      note: noteInput.trim() || null,
    });

    updateBook(book.id, { currentPage: page });

    router.back();
  };

  const handleDiscard = () => {
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

  const isPageValid = () => {
    const page = parseInt(pageInput, 10);
    return !isNaN(page) && page >= book.currentPage && page <= book.pageCount;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        {status !== "STOPPED" && (
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: "#007AFF", fontSize: 16 }}>← Volver</Text>
          </Pressable>
        )}
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

      {status !== "STOPPED" ? (
        <>
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
        </>
      ) : (
        /* Close flow */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 4 }}>
            Sesión finalizada
          </Text>
          <Text style={{ fontSize: 15, color: "#666", marginBottom: 24 }}>
            Duración: {formatTime(elapsedSeconds)}
          </Text>

          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
            ¿En qué página quedaste?
          </Text>
          <TextInput
            value={pageInput}
            onChangeText={setPageInput}
            placeholder={`Página actual (${book.currentPage}–${book.pageCount})`}
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>
            Nota (opcional)
          </Text>
          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="¿Qué te pareció lo que leíste?"
            multiline
            numberOfLines={3}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: "top",
              marginBottom: 24,
            }}
          />

          <Pressable
            onPress={handleSave}
            style={{
              backgroundColor: isPageValid() ? "#34C759" : "#ccc",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
            disabled={!isPageValid()}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Guardar sesión
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            style={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: "#FF3B30", fontSize: 15 }}>
              Descartar
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
