import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { getPagesPerDay, getWeeklyStats } from "@/lib/stats";
import { useSessionsStore } from "@/store/sessions";

export default function StatsScreen() {
  const sessions = useSessionsStore((s) => s.sessions);
  const weekly = useMemo(() => getWeeklyStats(sessions), [sessions]);
  const pagesPerDay7 = useMemo(() => getPagesPerDay(sessions, 7), [sessions]);
  const pagesPerDay30 = useMemo(() => getPagesPerDay(sessions, 30), [sessions]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Estadísticas
      </Text>

      <Text style={{ fontSize: 15, fontWeight: "600", color: "#666", marginBottom: 12 }}>
        Esta semana
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Minutos" value={weekly.totalMinutes} />
        <StatCard label="Sesiones" value={weekly.totalSessions} />
      </View>

      <Text style={{ fontSize: 15, fontWeight: "600", color: "#666", marginTop: 24, marginBottom: 12 }}>
        Páginas/día promedio
      </Text>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Últimos 7 días" value={pagesPerDay7} />
        <StatCard label="Últimos 30 días" value={pagesPerDay30} />
      </View>
    </ScrollView>
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
