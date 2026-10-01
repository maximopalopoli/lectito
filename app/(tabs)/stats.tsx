import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import Heatmap from "@/components/Heatmap";
import {
  getBestStreak,
  getBooksPerMonth,
  getGoalProgress,
  getMinutesPerDayLastWeek,
  getPagesPerDay,
  getReadingHeatmap,
  getStreak,
  getWeeklyStats,
} from "@/lib/stats";
import { spacing, useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { useGoalsStore } from "@/store/goals";
import { useSessionsStore } from "@/store/sessions";

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);
  const goal = useGoalsStore((s) => s.goal);
  const weekly = useMemo(() => getWeeklyStats(sessions), [sessions]);
  const pagesPerDay7 = useMemo(() => getPagesPerDay(sessions, 7), [sessions]);
  const pagesPerDay30 = useMemo(() => getPagesPerDay(sessions, 30), [sessions]);
  const streak = useMemo(() => getStreak(sessions), [sessions]);
  const bestStreak = useMemo(() => getBestStreak(sessions), [sessions]);
  const dailyMinutes = useMemo(
    () => getMinutesPerDayLastWeek(sessions),
    [sessions],
  );
  const heatmapData = useMemo(
    () => getReadingHeatmap(sessions),
    [sessions],
  );
  const monthlyBooks = useMemo(
    () => getBooksPerMonth(books),
    [books],
  );

  const maxMinutes = Math.max(...dailyMinutes.map((d) => d.minutes), 1);
  const maxMonthlyBooks = Math.max(...monthlyBooks.map((m) => m.count), 1);
  const hasData = sessions.length > 0;

  if (!hasData) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Ionicons
          name="stats-chart-outline"
          size={56}
          color={colors.icon}
          style={{ marginBottom: 16 }}
        />
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
          Sin datos todavía
        </Text>
        <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: "center" }}>
          {books.length > 0
            ? "Completá tu primera sesión de lectura para ver tus estadísticas acá."
            : "Agregá un libro y completá tu primera sesión para ver tus estadísticas acá."}
        </Text>
        <AnimatedPressable
          onPress={() => router.push(books.length > 0 ? "/library" : "/book/add")}
          accessibilityRole="button"
          style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, marginTop: 20 }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: "600" }}>
            {books.length > 0 ? "Ir a mi biblioteca" : "Agregar libro"}
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.textPrimary, marginBottom: 24 }}>
        Estadísticas
      </Text>

      {/* Weekly summary */}
      <SectionTitle>Esta semana</SectionTitle>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Minutos" value={weekly.totalMinutes} />
        <StatCard label="Sesiones" value={weekly.totalSessions} />
      </View>

      {/* Goal progress */}
      <GoalSection sessions={sessions} goal={goal} router={router} />

      {/* Pages per day */}
      <SectionTitle>Páginas/día promedio</SectionTitle>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Últimos 7 días" value={pagesPerDay7} />
        <StatCard label="Últimos 30 días" value={pagesPerDay30} />
      </View>

      {/* Streak */}
      <SectionTitle>Racha de lectura</SectionTitle>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.warning }}>
            {streak}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            racha actual
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.warning }}>
            {bestStreak}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            mejor racha
          </Text>
        </View>
      </View>

      {/* Heatmap */}
      <SectionTitle>Actividad de lectura</SectionTitle>
      <Heatmap data={heatmapData} />

      {/* Minutes chart */}
      <SectionTitle>Minutos por día (últimos 7 días)</SectionTitle>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 120,
          }}
        >
          {dailyMinutes.map((day, index) => (
            <AnimatedBar
              key={day.label}
              label={day.label}
              minutes={day.minutes}
              maxMinutes={maxMinutes}
              index={index}
            />
          ))}
        </View>
      </View>

      {/* Books per month */}
      <SectionTitle>Libros terminados</SectionTitle>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 120,
          }}
        >
          {monthlyBooks.map((month, index) => (
            <MonthlyBookBar
              key={month.label}
              label={month.label}
              count={month.count}
              maxCount={maxMonthlyBooks}
              index={index}
            />
          ))}
        </View>
      </View>

      {/* Share stats */}
      <AnimatedPressable
        onPress={() => router.push("/share-stats")}
        haptic="medium"
        style={{
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>
          Compartir mi resumen
        </Text>
      </AnimatedPressable>

      {/* Backup */}
      <AnimatedPressable
        onPress={() => router.push("/settings/backup")}
        haptic="light"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 32,
          paddingVertical: 12,
        }}
      >
        <Ionicons name="cloud-download-outline" size={18} color={colors.textTertiary} />
        <Text style={{ fontSize: 14, color: colors.textTertiary }}>Backup</Text>
      </AnimatedPressable>
    </ScrollView>
  );
}

function MonthlyBookBar({
  label,
  count,
  maxCount,
  index,
}: {
  label: string;
  count: number;
  maxCount: number;
  index: number;
}) {
  const colors = useTheme();
  const targetHeight = Math.max(
    (count / maxCount) * 90,
    count > 0 ? 4 : 0,
  );
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withDelay(
      index * 80,
      withTiming(targetHeight, { duration: 500 }),
    );
  }, [targetHeight, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
        {count > 0 ? count : ""}
      </Text>
      <Animated.View
        style={[
          {
            width: 24,
            backgroundColor: count > 0 ? colors.success : colors.track,
            borderRadius: 4,
            minHeight: 4,
          },
          animatedStyle,
        ]}
      />
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function AnimatedBar({
  label,
  minutes,
  maxMinutes,
  index,
}: {
  label: string;
  minutes: number;
  maxMinutes: number;
  index: number;
}) {
  const colors = useTheme();
  const targetHeight = Math.max(
    (minutes / maxMinutes) * 90,
    minutes > 0 ? 4 : 0,
  );
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withDelay(
      index * 80,
      withTiming(targetHeight, { duration: 500 }),
    );
  }, [targetHeight, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>
        {minutes > 0 ? minutes : ""}
      </Text>
      <Animated.View
        style={[
          {
            width: 24,
            backgroundColor: minutes > 0 ? colors.primary : colors.track,
            borderRadius: 4,
            minHeight: 4,
          },
          animatedStyle,
        ]}
      />
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colors = useTheme();
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "600",
        color: colors.textSecondary,
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const colors = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.primary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function GoalSection({
  sessions,
  goal,
  router,
}: {
  sessions: import("@/types").Session[];
  goal: import("@/types").Goal | null;
  router: ReturnType<typeof useRouter>;
}) {
  const colors = useTheme();
  const metricLabel = goal?.metric === "pages" ? "pág" : "min";
  const periodLabel = goal?.period === "weekly" ? "esta semana" : "hoy";

  const progress = useMemo(
    () => (goal ? getGoalProgress(sessions, goal) : null),
    [sessions, goal],
  );

  return (
    <>
      <SectionTitle>Objetivo</SectionTitle>
      {goal && progress ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>
              {progress.current}/{progress.target} {metricLabel} {periodLabel}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "bold",
                color: progress.percentage >= 100 ? colors.success : colors.primary,
              }}
            >
              {progress.percentage}%
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              backgroundColor: colors.track,
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                height: 8,
                backgroundColor:
                  progress.percentage >= 100 ? colors.success : colors.primary,
                borderRadius: 4,
                width: `${progress.percentage}%`,
              }}
            />
          </View>

          <AnimatedPressable
            onPress={() => router.push("/goals/configure")}
            haptic="light"
            scaleDown={0.97}
            style={{ alignItems: "center", paddingTop: 4 }}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "500" }}>
              Cambiar objetivo
            </Text>
          </AnimatedPressable>
        </View>
      ) : (
        <AnimatedPressable
          onPress={() => router.push("/goals/configure")}
          haptic="light"
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="flag-outline"
            size={28}
            color={colors.textTertiary}
            style={{ marginBottom: 8 }}
          />
          <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: "500" }}>
            Configurar objetivo
          </Text>
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
            Definí una meta diaria o semanal
          </Text>
        </AnimatedPressable>
      )}
    </>
  );
}
