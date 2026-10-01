import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCover from "@/components/BookCover";
import { spacing, useTheme } from "@/lib/theme";
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
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const books = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const addSession = useSessionsStore((s) => s.addSession);

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>("RUNNING");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(new Date().toISOString());
  // Wall-clock timing: keep the elapsed time of completed (paused) segments and
  // measure the active segment from a start timestamp. The interval only drives
  // the on-screen display — the value is always derived from real timestamps, so
  // if the OS throttles/suspends JS timers in the background we don't undercount.
  const accumulatedMsRef = useRef(0);
  const runStartRef = useRef<number | null>(null);

  useKeepAwake();

  const [pageInput, setPageInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const syncElapsed = () => {
    const running =
      runStartRef.current != null ? Date.now() - runStartRef.current : 0;
    setElapsedSeconds(Math.floor((accumulatedMsRef.current + running) / 1000));
  };

  const flushRunningSegment = () => {
    if (runStartRef.current != null) {
      accumulatedMsRef.current += Date.now() - runStartRef.current;
      runStartRef.current = null;
    }
  };

  // Start timer on mount; cleanup clears whatever interval is active
  // (including intervals recreated during pause/resume)
  useEffect(() => {
    runStartRef.current = Date.now();
    intervalRef.current = setInterval(syncElapsed, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const handlePauseResume = () => {
    if (status === "RUNNING") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      flushRunningSegment();
      syncElapsed();
      setStatus("PAUSED");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (status === "PAUSED") {
      runStartRef.current = Date.now();
      intervalRef.current = setInterval(syncElapsed, 1000);
      setStatus("RUNNING");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    flushRunningSegment();
    syncElapsed();
    setStatus("STOPPED");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (router.canGoBack()) router.back(); else router.replace("/");
  };

  const handleDiscard = () => {
    if (router.canGoBack()) router.back(); else router.replace("/");
  };

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Libro no encontrado</Text>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Volver</Text>
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
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        {status !== "STOPPED" && (
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={{ padding: 4 }}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>← Volver</Text>
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
        <BookCover uri={book.coverUrl} width={48} height={70} radius={4} />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary }}
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
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
                color: status === "PAUSED" ? colors.textTertiary : colors.textPrimary,
              }}
            >
              {formatTime(elapsedSeconds)}
            </Text>
            {status === "PAUSED" && (
              <Text style={{ color: colors.textTertiary, fontSize: 14, marginTop: 8 }}>
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
            <AnimatedPressable
              onPress={handlePauseResume}
              haptic="none"
              style={{
                flex: 1,
                backgroundColor: status === "PAUSED" ? colors.success : colors.primary,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
                {status === "PAUSED" ? "Reanudar" : "Pausar"}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleStop}
              haptic="none"
              style={{
                flex: 1,
                backgroundColor: colors.danger,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
                Detener
              </Text>
            </AnimatedPressable>
          </View>
        </>
      ) : (
        /* Close flow */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 }}>
            Sesión finalizada
          </Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 24 }}>
            Duración: {formatTime(elapsedSeconds)}
          </Text>

          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 }}>
            ¿En qué página quedaste?
          </Text>
          <TextInput
            value={pageInput}
            onChangeText={setPageInput}
            placeholder={`Página actual (${book.currentPage}–${book.pageCount})`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              color: colors.textPrimary,
              marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 }}>
            Nota (opcional)
          </Text>
          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="¿Qué te pareció lo que leíste?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              color: colors.textPrimary,
              minHeight: 80,
              textAlignVertical: "top",
              marginBottom: 24,
            }}
          />

          <AnimatedPressable
            onPress={handleSave}
            haptic="none"
            style={{
              backgroundColor: isPageValid() ? colors.success : "#ccc",
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
            disabled={!isPageValid()}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
              Guardar sesión
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleDiscard}
            haptic="light"
            style={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: colors.danger, fontSize: 15 }}>
              Descartar
            </Text>
          </AnimatedPressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
