import { useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import { getGoalProgress, getStreak, getTodayStats } from "@/lib/stats";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { useGoalsStore } from "@/store/goals";
import { useSessionsStore } from "@/store/sessions";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);
  const goal = useGoalsStore((s) => s.goal);

  const todayStats = useMemo(() => getTodayStats(sessions), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);
  const goalProgress = useMemo(
    () => (goal ? getGoalProgress(sessions, goal) : null),
    [sessions, goal],
  );

  const readingBooks = books.filter((b) => b.status === "READING");

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
      <Text
        style={{
          fontSize: fontSize.display,
          fontWeight: fontWeight.bold,
          color: colors.textPrimary,
          marginBottom: spacing.xl,
        }}
      >
        Hola!
      </Text>

      {/* Today summary */}
      <Text
        style={{
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
          color: colors.textSecondary,
          marginBottom: spacing.md,
        }}
      >
        Resumen de hoy
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
        <SummaryCard value={todayStats.minutes} label="minutos" color={colors.primary} />
        <SummaryCard value={todayStats.pages} label="páginas" color={colors.primary} />
        <SummaryCard value={streak} label="racha" color={colors.warning} />
      </View>

      {/* Goal progress */}
      {goal && goalProgress && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: 14,
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary }}>
              {goalProgress.current}/{goalProgress.target}{" "}
              {goal.metric === "minutes" ? "min" : "pág"}{" "}
              {goal.period === "daily" ? "hoy" : "esta semana"}
            </Text>
            <Text
              style={{
                fontSize: fontSize.md,
                fontWeight: fontWeight.bold,
                color: goalProgress.percentage >= 100 ? colors.success : colors.primary,
              }}
            >
              {goalProgress.percentage}%
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.track, borderRadius: 3 }}>
            <View
              style={{
                height: 6,
                backgroundColor:
                  goalProgress.percentage >= 100 ? colors.success : colors.primary,
                borderRadius: 3,
                width: `${goalProgress.percentage}%`,
              }}
            />
          </View>
        </View>
      )}

      {/* Continue reading */}
      {readingBooks.length > 0 ? (
        <>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.textSecondary,
              marginBottom: spacing.md,
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
              <View key={book.id} style={{ marginBottom: spacing.md }}>
                <AnimatedPressable
                  onPress={() => router.push(`/book/${book.id}`)}
                  haptic="light"
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.xl,
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
                        backgroundColor: colors.border,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="book" size={24} color={colors.textTertiary} />
                    </View>
                  )}
                  <View
                    style={{
                      flex: 1,
                      marginLeft: spacing.md,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary }}
                      numberOfLines={1}
                    >
                      {book.title}
                    </Text>
                    <Text
                      style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {book.authors.join(", ")}
                    </Text>
                    {book.pageCount > 0 && (
                      <>
                        <View
                          style={{
                            height: 4,
                            backgroundColor: colors.track,
                            borderRadius: 2,
                            marginTop: spacing.sm,
                          }}
                        >
                          <View
                            style={{
                              height: 4,
                              backgroundColor: colors.primary,
                              borderRadius: 2,
                              width: `${progress}%`,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: fontSize.xs,
                            color: colors.textTertiary,
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
                      backgroundColor: colors.primary,
                      borderRadius: radius.lg,
                      width: 44,
                      height: 44,
                      justifyContent: "center",
                      alignItems: "center",
                      marginLeft: spacing.sm,
                    }}
                  >
                    <Ionicons name="play" size={22} color={colors.onPrimary} />
                  </AnimatedPressable>
                </AnimatedPressable>
              </View>
            );
          })}
        </>
      ) : (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.xl,
            alignItems: "center",
            marginTop: spacing.sm,
          }}
        >
          <Ionicons
            name="book-outline"
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
            No estás leyendo nada
          </Text>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.textTertiary,
              textAlign: "center",
              marginBottom: spacing.lg,
            }}
          >
            {"Marcá un libro como \"Leyendo\" para empezar a registrar sesiones."}
          </Text>
          <AnimatedPressable
            onPress={() => router.push("/book/add")}
            haptic="medium"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.xl,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
              Agregar libro
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: fontSize.hero, fontWeight: fontWeight.bold, color }}>
        {value}
      </Text>
      <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}
