import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCover from "@/components/BookCover";
import CircleIconButton from "@/components/CircleIconButton";
import { getGoalProgress, getStreak, getTodayStats } from "@/lib/stats";
import { readingProgress } from "@/lib/progress";
import { showToast } from "@/lib/toast";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { useGoalsStore } from "@/store/goals";
import { useProfileStore } from "@/store/profile";
import { useReaderSettingsStore } from "@/store/readerSettings";
import { useSessionsStore } from "@/store/sessions";
import type { Book } from "@/types/book";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);
  const goal = useGoalsStore((s) => s.goal);
  const name = useProfileStore((s) => s.name);
  const goalsReady = useGoalsStore((s) => s._hydrated);
  const suggestionDismissed = useGoalsStore((s) => s.suggestionDismissed);
  const setGoal = useGoalsStore((s) => s.setGoal);
  const clearGoal = useGoalsStore((s) => s.clearGoal);
  const dismissSuggestion = useGoalsStore((s) => s.dismissSuggestion);

  const todayStats = useMemo(() => getTodayStats(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);
  const goalProgress = useMemo(
    () => (goal ? getGoalProgress(sessions, goal) : null),
    [sessions, goal],
  );

  // Libros en curso ordenados por última sesión (o fecha de alta si nunca se leyó).
  const { readingBooks, lastReadAt } = useMemo(() => {
    const last = new Map<string, string>();
    for (const s of sessions) {
      const prev = last.get(s.bookId);
      if (!prev || s.startedAt > prev) last.set(s.bookId, s.startedAt);
    }
    const reading = books
      .filter((b) => b.status === "READING")
      .sort((a, b) =>
        (last.get(b.id) ?? b.addedAt).localeCompare(last.get(a.id) ?? a.addedAt),
      );
    return { readingBooks: reading, lastReadAt: last };
  }, [books, sessions]);

  const [current, ...others] = readingBooks;
  // Primer uso: sin libros ni sesiones no tiene sentido mostrar el resumen de hoy en cero.
  const isNewUser = books.length === 0 && sessions.length === 0;
  const showGoalSuggestion = goalsReady && !goal && !suggestionDismissed;
  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.xl,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontSize: fontSize.display,
              fontWeight: fontWeight.bold,
              color: colors.textPrimary,
            }}
          >
            {name ? `¡Hola, ${name}!` : "¡Hola!"}
          </Text>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.textTertiary,
              marginTop: 2,
            }}
          >
            {today}
          </Text>
        </View>
        <CircleIconButton
          icon="add"
          label="Agregar libro"
          onPress={() => router.push("/book/add")}
        />
      </View>

      {/* Hoy: objetivo + resumen compacto */}
      {!isNewUser && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}
        >
          {goal && goalProgress && (
            <View style={{ marginBottom: spacing.md }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary }}>
                  Objetivo {goal.period === "daily" ? "de hoy" : "de la semana"}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                  {goalProgress.current}/{goalProgress.target}{" "}
                  {goal.metric === "minutes" ? "min" : "pág"}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3 }}>
                <View
                  style={{
                    height: 6,
                    backgroundColor:
                      goalProgress.percentage >= 100 ? colors.success : colors.primary,
                    borderRadius: 3,
                    width: `${Math.min(goalProgress.percentage, 100)}%`,
                  }}
                />
              </View>
            </View>
          )}
          {showGoalSuggestion && (
            <GoalSuggestion
              onPick={(target) => {
                setGoal({ period: "daily", metric: "minutes", target });
                showToast({
                  message: `Objetivo: ${target} min por día`,
                  actionLabel: "Deshacer",
                  onAction: clearGoal,
                });
              }}
              onCustom={() => router.push("/goals/configure")}
              onDismiss={dismissSuggestion}
            />
          )}
          <View style={{ flexDirection: "row" }}>
            <InlineStat icon="time-outline" value={todayStats.minutes} label="min hoy" color={colors.primary} />
            <InlineStat icon="document-text-outline" value={todayStats.pages} label="pág hoy" color={colors.primary} />
            <InlineStat
              icon="flame"
              value={streak}
              label={streak === 1 ? "día de racha" : "días de racha"}
              color={colors.warning}
            />
          </View>
        </View>
      )}

      {current ? (
        <>
          <SectionTitle>Seguí leyendo</SectionTitle>
          <CurrentBookCard
            book={current}
            lastReadAt={lastReadAt.get(current.id) ?? null}
            onOpen={() => router.push(`/book/${current.id}`)}
            onRead={() => router.push(`/session/${current.id}`)}
          />

          {others.length > 0 && (
            <>
              <SectionTitle>También estás leyendo</SectionTitle>
              {others.map((book) => (
                <ReadingRow
                  key={book.id}
                  book={book}
                  onOpen={() => router.push(`/book/${book.id}`)}
                  onRead={() => router.push(`/session/${book.id}`)}
                />
              ))}
            </>
          )}
        </>
      ) : (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            alignItems: "center",
          }}
        >
          <Ionicons
            name={isNewUser ? "library-outline" : "book-outline"}
            size={48}
            color={colors.icon}
            style={{ marginBottom: spacing.md }}
          />
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            {isNewUser ? "Empezá tu biblioteca" : "No estás leyendo nada"}
          </Text>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.textTertiary,
              textAlign: "center",
              marginBottom: spacing.lg,
            }}
          >
            {isNewUser
              ? "Agregá el libro que estás leyendo y registrá cada sesión para seguir tu progreso."
              : "Marcá un libro como \"Leyendo\" para empezar a registrar sesiones."}
          </Text>
          <AnimatedPressable
            onPress={() => router.push(isNewUser ? "/book/add" : "/library")}
            haptic="medium"
            accessibilityRole="button"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.xl,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
              {isNewUser ? "Agregar mi primer libro" : "Ir a mi biblioteca"}
            </Text>
          </AnimatedPressable>
          {isNewUser && (
            <AnimatedPressable
              onPress={() => router.push("/settings/backup")}
              haptic="light"
              scaleDown={0.97}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.lg, marginTop: spacing.sm }}
            >
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                Restaurar un backup
              </Text>
            </AnimatedPressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const GOAL_PRESETS = [15, 30, 45];

/** Primer uso sin objetivo: propone una meta diaria con un toque, sin pasar por el formulario. */
function GoalSuggestion({
  onPick,
  onCustom,
  onDismiss,
}: {
  onPick: (minutes: number) => void;
  onCustom: () => void;
  onDismiss: () => void;
}) {
  const colors = useTheme();
  const chip = {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  return (
    <View
      style={{
        marginBottom: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary }}>
            ¿Te ponés un objetivo diario?
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
            Un ratito por día ayuda a sostener el hábito.
          </Text>
        </View>
        <AnimatedPressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Ahora no"
          hitSlop={8}
          style={{ padding: 4, marginLeft: spacing.sm }}
        >
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </AnimatedPressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
        {GOAL_PRESETS.map((minutes) => (
          <AnimatedPressable
            key={minutes}
            onPress={() => onPick(minutes)}
            accessibilityRole="button"
            accessibilityLabel={`${minutes} minutos por día`}
            style={{ ...chip, backgroundColor: colors.primary }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>
              {minutes} min
            </Text>
          </AnimatedPressable>
        ))}
        <AnimatedPressable
          onPress={onCustom}
          accessibilityRole="button"
          style={{ ...chip, backgroundColor: colors.background }}
        >
          <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>
            Otro…
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colors = useTheme();
  return (
    <Text
      style={{
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </Text>
  );
}

function InlineStat({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color }}>
          {value}
        </Text>
      </View>
      <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function ProgressBar({ percent, height }: { percent: number; height: number }) {
  const colors = useTheme();
  return (
    <View style={{ height, backgroundColor: colors.track, borderRadius: height / 2 }}>
      <View
        style={{
          height,
          backgroundColor: colors.primary,
          borderRadius: height / 2,
          width: `${percent}%`,
        }}
      />
    </View>
  );
}

function formatLastRead(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return "Leíste hoy";
  if (days === 1) return "Leíste ayer";
  if (days < 30) return `Última sesión hace ${days} días`;
  return `Última sesión el ${new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

function CurrentBookCard({
  book,
  lastReadAt,
  onOpen,
  onRead,
}: {
  book: Book;
  lastReadAt: string | null;
  onOpen: () => void;
  onRead: () => void;
}) {
  const colors = useTheme();
  const position = useReaderSettingsStore((s) => s.positions[book.id]);
  const progress = readingProgress(book, position);
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.xl,
      }}
    >
      <AnimatedPressable
        onPress={onOpen}
        haptic="light"
        scaleDown={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Ver ${book.title}`}
        style={{ flexDirection: "row" }}
      >
        <BookCover uri={book.coverUrl} width={80} height={120} />
        <View style={{ flex: 1, marginLeft: spacing.lg, justifyContent: "center" }}>
          <Text
            style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary }}
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text
            style={{ fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {book.authors.join(", ")}
          </Text>
          {(book.pageCount > 0 || progress.byPercent) && (
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar percent={progress.percent} height={6} />
              <Text
                style={{ fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.xs }}
                numberOfLines={2}
              >
                {progress.byPercent
                  ? `${progress.percent}% leído${progress.chapter ? ` · ${progress.chapter}` : ""}`
                  : `Pág. ${book.currentPage} de ${book.pageCount} · ${progress.percent}%`}
              </Text>
            </View>
          )}
          {lastReadAt && (
            <Text style={{ fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs }}>
              {formatLastRead(lastReadAt)}
            </Text>
          )}
        </View>
      </AnimatedPressable>
      <AnimatedPressable
        onPress={onRead}
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel={`Iniciar sesión de lectura de ${book.title}`}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          minHeight: 48,
          marginTop: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
        }}
      >
        <Ionicons name="play" size={18} color={colors.onPrimary} />
        <Text style={{ color: colors.onPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
          {book.currentPage > 0 ? "Continuar leyendo" : "Empezar a leer"}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

function ReadingRow({
  book,
  onOpen,
  onRead,
}: {
  book: Book;
  onOpen: () => void;
  onRead: () => void;
}) {
  const colors = useTheme();
  const position = useReaderSettingsStore((s) => s.positions[book.id]);
  const progress = readingProgress(book, position);
  return (
    // Sin accessibilityRole="button": contiene el botón de play, y en web
    // eso generaría un <button> anidado dentro de otro.
    <AnimatedPressable
      onPress={onOpen}
      haptic="light"
      accessibilityLabel={`Ver ${book.title}`}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
      }}
    >
      <BookCover uri={book.coverUrl} width={40} height={60} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text
          style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary }}
          numberOfLines={1}
        >
          {book.title}
        </Text>
        <Text
          style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 }}
          numberOfLines={1}
        >
          {book.authors.join(", ")}
        </Text>
        {(book.pageCount > 0 || progress.byPercent) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <ProgressBar percent={progress.percent} height={4} />
            </View>
            <Text style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>{progress.percent}%</Text>
          </View>
        )}
      </View>
      <AnimatedPressable
        onPress={onRead}
        accessibilityRole="button"
        accessibilityLabel={`Iniciar sesión de lectura de ${book.title}`}
        haptic="medium"
        scaleDown={0.9}
        style={{
          backgroundColor: colors.primaryTint,
          borderRadius: 22,
          width: 44,
          height: 44,
          justifyContent: "center",
          alignItems: "center",
          marginLeft: spacing.md,
        }}
      >
        <Ionicons name="play" size={18} color={colors.primary} />
      </AnimatedPressable>
    </AnimatedPressable>
  );
}
