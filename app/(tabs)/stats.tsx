import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { getWeeklyStats } from "@/lib/stats";
import { useSessionsStore } from "@/store/sessions";

export default function StatsScreen() {
  const sessions = useSessionsStore((s) => s.sessions);
  const weekly = useMemo(() => getWeeklyStats(sessions), [sessions]);

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
