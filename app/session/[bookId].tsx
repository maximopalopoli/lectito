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
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCover from "@/components/BookCover";
import ScreenHeader from "@/components/ScreenHeader";
import { confirmThen } from "@/lib/confirm";
import { radius, spacing, useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";

type TimerStatus = "IDLE" | "RUNNING" | "PAUSED" | "STOPPED";

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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export default function SessionScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const books = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const changeStatus = useBooksStore((s) => s.changeStatus);
  const addSession = useSessionsStore((s) => s.addSession);

  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<TimerStatus>("IDLE");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string | null>(null);
  // Wall-clock timing: keep the elapsed time of completed (paused) segments and
  // measure the active segment from a start timestamp. The interval only drives
  // the on-screen display — the value is always derived from real timestamps, so
  // if the OS throttles/suspends JS timers in the background we don't undercount.
  const accumulatedMsRef = useRef(0);
  const runStartRef = useRef<number | null>(null);

  useKeepAwake();

  const [pageInput, setPageInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [markDone, setMarkDone] = useState(true);

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

  const startTicking = () => {
    runStartRef.current = Date.now();
    intervalRef.current = setInterval(syncElapsed, 1000);
  };

  const stopTicking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    flushRunningSegment();
    syncElapsed();
  };

  // Cleanup clears whatever interval is active (including ones recreated on resume)
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const handleStart = () => {
    startedAtRef.current = new Date().toISOString();
    startTicking();
    setStatus("RUNNING");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePauseResume = () => {
    if (status === "RUNNING") {
      stopTicking();
      setStatus("PAUSED");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (status === "PAUSED") {
      startTicking();
      setStatus("RUNNING");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFinish = () => {
    stopTicking();
    setStatus("STOPPED");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const leave = () => {
    if (router.canGoBack()) router.back(); else router.replace("/");
  };

  // Con el timer en curso (y más de un minuto contado), confirmar antes de salir.
  // Cubre la flecha del header, el botón atrás de Android y los gestos.
  const timing = status === "RUNNING" || status === "PAUSED";
  usePreventRemove(timing && elapsedSeconds >= 60, ({ data }) => {
    confirmThen(
      "¿Salir sin guardar?",
      `Vas a perder ${formatDuration(elapsedSeconds)} de lectura.`,
      "Salir",
      () => navigation.dispatch(data.action),
    );
  });

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Libro no encontrado</Text>
        <Pressable onPress={leave} style={{ marginTop: 16, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const hasPageCount = book.pageCount > 0;
  const page = parseInt(pageInput, 10);
  const pageEntered = pageInput.trim().length > 0;
  const pageValid =
    !isNaN(page) && page >= book.currentPage && (!hasPageCount || page <= book.pageCount);
  const pagesRead = pageValid ? page - book.currentPage : 0;
  const reachedEnd = pageValid && hasPageCount && page === book.pageCount;

  const handleSave = () => {
    if (!pageValid) return;

    addSession({
      bookId: book.id,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationMin: Math.max(1, Math.round(elapsedSeconds / 60)),
      pagesRead,
      note: noteInput.trim() || null,
    });

    updateBook(book.id, { currentPage: page });
    if (reachedEnd && markDone) changeStatus(book.id, "DONE");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    leave();
  };

  const handleDiscard = () => {
    confirmThen(
      "Descartar sesión",
      `No se va a registrar esta sesión de ${formatDuration(elapsedSeconds)}.`,
      "Descartar",
      leave,
    );
  };

  const statusLabel =
    status === "IDLE" ? "Listo para empezar" : status === "PAUSED" ? "En pausa" : "Leyendo";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {status !== "STOPPED" ? (
        <>
          <ScreenHeader title="Sesión de lectura" onBack={leave} />

          {/* Book info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.md,
              marginHorizontal: spacing.lg,
              marginTop: spacing.sm,
              gap: spacing.md,
            }}
          >
            <BookCover uri={book.coverUrl} width={48} height={72} radius={4} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}
                numberOfLines={2}
              >
                {book.title}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {book.authors.join(", ")}
              </Text>
              {hasPageCount && (
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                  Ibas por la pág. {book.currentPage} de {book.pageCount}
                </Text>
              )}
            </View>
          </View>

          {/* Timer */}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 1,
                textTransform: "uppercase",
                color: status === "RUNNING" ? colors.primary : colors.textTertiary,
                marginBottom: spacing.sm,
              }}
            >
              {statusLabel}
            </Text>
            <Text
              accessibilityRole="timer"
              accessibilityLabel={`Tiempo de lectura ${formatTime(elapsedSeconds)}`}
              style={{
                fontSize: 72,
                fontWeight: "200",
                fontVariant: ["tabular-nums"],
                color: status === "RUNNING" ? colors.textPrimary : colors.textTertiary,
              }}
            >
              {formatTime(elapsedSeconds)}
            </Text>
          </View>

          {/* Controls */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: spacing.xxl,
              paddingHorizontal: spacing.xl,
              paddingBottom: insets.bottom + 48,
            }}
          >
            {status === "IDLE" ? (
              <TimerButton
                icon="play"
                label="Empezar"
                size={88}
                onPress={handleStart}
                background={colors.primary}
                iconColor={colors.onPrimary}
              />
            ) : (
              <>
                <TimerButton
                  icon={status === "PAUSED" ? "play" : "pause"}
                  label={status === "PAUSED" ? "Reanudar" : "Pausar"}
                  size={88}
                  onPress={handlePauseResume}
                  background={colors.primary}
                  iconColor={colors.onPrimary}
                />
                <TimerButton
                  icon="stop"
                  label="Terminar"
                  size={88}
                  onPress={handleFinish}
                  background={colors.surface}
                  iconColor={colors.danger}
                />
              </>
            )}
          </View>
        </>
      ) : (
        /* Close flow */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + spacing.xl,
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary */}
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.textPrimary, marginTop: spacing.sm }}>
              ¡Buena sesión!
            </Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
              {formatDuration(elapsedSeconds)} con {book.title}
            </Text>
          </View>

          {/* Page */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>
              ¿En qué página quedaste?
            </Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2, marginBottom: spacing.md }}>
              {hasPageCount
                ? `Ibas por la ${book.currentPage} de ${book.pageCount}`
                : `Ibas por la ${book.currentPage}`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <TextInput
                value={pageInput}
                onChangeText={(t) => setPageInput(t.replace(/[^0-9]/g, ""))}
                placeholder={String(book.currentPage)}
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                autoFocus
                accessibilityLabel="Página actual"
                style={{
                  width: 110,
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: pageEntered && !pageValid ? colors.danger : colors.border,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.md,
                  fontSize: 24,
                  fontWeight: "600",
                  textAlign: "center",
                  color: colors.textPrimary,
                }}
              />
              <View style={{ flex: 1 }}>
                {pageEntered && !pageValid ? (
                  <Text style={{ fontSize: 13, color: colors.danger }}>
                    {hasPageCount
                      ? `Tiene que estar entre ${book.currentPage} y ${book.pageCount}`
                      : `Tiene que ser ${book.currentPage} o más`}
                  </Text>
                ) : pageValid ? (
                  <Text style={{ fontSize: 15, fontWeight: "600", color: pagesRead > 0 ? colors.success : colors.textTertiary }}>
                    {pagesRead > 0 ? `+${pagesRead} ${pagesRead === 1 ? "página" : "páginas"}` : "Sin avance de páginas"}
                  </Text>
                ) : hasPageCount && book.currentPage < book.pageCount ? (
                  <Pressable
                    onPress={() => setPageInput(String(book.pageCount))}
                    accessibilityRole="button"
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 14, color: colors.primary }}>Llegué al final</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {reachedEnd && (
              <Pressable
                onPress={() => setMarkDone((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: markDone }}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, minHeight: 44 }}
              >
                <Ionicons
                  name={markDone ? "checkbox" : "square-outline"}
                  size={22}
                  color={markDone ? colors.success : colors.textTertiary}
                />
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>Marcar el libro como terminado</Text>
              </Pressable>
            )}
          </View>

          {/* Note */}
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>
            Nota <Text style={{ fontWeight: "400", color: colors.textTertiary }}>(opcional)</Text>
          </Text>
          <TextInput
            value={noteInput}
            onChangeText={setNoteInput}
            placeholder="¿Qué te pareció lo que leíste?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.lg,
              fontSize: 15,
              color: colors.textPrimary,
              minHeight: 96,
              textAlignVertical: "top",
              marginBottom: spacing.xl,
            }}
          />

          <AnimatedPressable
            onPress={handleSave}
            haptic="none"
            disabled={!pageValid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !pageValid }}
            style={{
              backgroundColor: colors.primary,
              opacity: pageValid ? 1 : 0.4,
              minHeight: 50,
              borderRadius: radius.lg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
              Guardar sesión
            </Text>
          </AnimatedPressable>

          <Pressable
            onPress={handleDiscard}
            accessibilityRole="button"
            style={{ alignItems: "center", justifyContent: "center", minHeight: 44 }}
          >
            <Text style={{ color: colors.danger, fontSize: 15 }}>
              Descartar sesión
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function TimerButton({
  icon,
  label,
  size,
  onPress,
  background,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size: number;
  onPress: () => void;
  background: string;
  iconColor: string;
}) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <AnimatedPressable
        onPress={onPress}
        haptic="none"
        scaleDown={0.92}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={size * 0.4} color={iconColor} />
      </AnimatedPressable>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}
