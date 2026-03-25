import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import {
  getBestStreak,
  getGoalProgress,
  getMinutesPerDayLastWeek,
  getPagesPerDay,
  getStreak,
  getWeeklyStats,
} from "@/lib/stats";
import { useGoalsStore } from "@/store/goals";
import { useSessionsStore } from "@/store/sessions";

export default function StatsScreen() {
  const router = useRouter();
  const sessions = useSessionsStore((s) => s.sessions);
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

  const maxMinutes = Math.max(...dailyMinutes.map((d) => d.minutes), 1);
  const hasData = sessions.length > 0;

  if (!hasData) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Ionicons
          name="stats-chart-outline"
          size={56}
          color="#ccc"
          style={{ marginBottom: 16 }}
        />
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 6 }}>
          Sin datos todavía
        </Text>
        <Text style={{ fontSize: 14, color: "#999", textAlign: "center" }}>
          Completá tu primera sesión de lectura para ver tus estadísticas acá.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 40,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
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
            racha actual
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
            {bestStreak}
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            mejor racha
          </Text>
        </View>
      </View>

      {/* Minutes chart */}
      <SectionTitle>Minutos por día (últimos 7 días)</SectionTitle>
      <View
        style={{
          backgroundColor: "#f5f5f5",
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
    </ScrollView>
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
      <Text style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
        {minutes > 0 ? minutes : ""}
      </Text>
      <Animated.View
        style={[
          {
            width: 24,
            backgroundColor: minutes > 0 ? "#007AFF" : "#ddd",
            borderRadius: 4,
            minHeight: 4,
          },
          animatedStyle,
        ]}
      />
      <Text style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "600",
        color: "#666",
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
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
        {value}
      </Text>
      <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
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
            backgroundColor: "#f5f5f5",
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
            <Text style={{ fontSize: 15, fontWeight: "600" }}>
              {progress.current}/{progress.target} {metricLabel} {periodLabel}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "bold",
                color: progress.percentage >= 100 ? "#34C759" : "#007AFF",
              }}
            >
              {progress.percentage}%
            </Text>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              backgroundColor: "#ddd",
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                height: 8,
                backgroundColor:
                  progress.percentage >= 100 ? "#34C759" : "#007AFF",
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
            <Text style={{ color: "#007AFF", fontSize: 14, fontWeight: "500" }}>
              Cambiar objetivo
            </Text>
          </AnimatedPressable>
        </View>
      ) : (
        <AnimatedPressable
          onPress={() => router.push("/goals/configure")}
          haptic="light"
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="flag-outline"
            size={28}
            color="#999"
            style={{ marginBottom: 8 }}
          />
          <Text style={{ fontSize: 15, color: "#666", fontWeight: "500" }}>
            Configurar objetivo
          </Text>
          <Text style={{ fontSize: 13, color: "#999", marginTop: 4 }}>
            Definí una meta diaria o semanal
          </Text>
        </AnimatedPressable>
      )}
    </>
  );
}
