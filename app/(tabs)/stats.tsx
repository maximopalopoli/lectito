import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import {
  getBestStreak,
  getMinutesPerDayLastWeek,
  getPagesPerDay,
  getStreak,
  getWeeklyStats,
} from "@/lib/stats";
import { useSessionsStore } from "@/store/sessions";

export default function StatsScreen() {
  const sessions = useSessionsStore((s) => s.sessions);
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
