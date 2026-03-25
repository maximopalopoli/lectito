import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import { useGoalsStore } from "@/store/goals";
import type { GoalMetric, GoalPeriod } from "@/types";

const METRICS: { label: string; value: GoalMetric }[] = [
  { label: "Minutos", value: "minutes" },
  { label: "Páginas", value: "pages" },
];

const PERIODS: { label: string; value: GoalPeriod }[] = [
  { label: "Por día", value: "daily" },
  { label: "Por semana", value: "weekly" },
];

export default function ConfigureGoalScreen() {
  const router = useRouter();
  const { goal, setGoal, clearGoal } = useGoalsStore();

  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "minutes");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "daily");
  const [target, setTarget] = useState(goal?.target?.toString() ?? "");

  const parsedTarget = parseInt(target, 10);
  const isValid = !isNaN(parsedTarget) && parsedTarget > 0;

  const handleSave = () => {
    if (!isValid) return;
    setGoal({ metric, period, target: parsedTarget });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    clearGoal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>← Volver</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 24 }}>
          {goal ? "Editar objetivo" : "Nuevo objetivo"}
        </Text>

        {/* Metric selector */}
        <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
          ¿Qué querés medir?
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          {METRICS.map((m) => {
            const isActive = m.value === metric;
            return (
              <AnimatedPressable
                key={m.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMetric(m.value);
                }}
                haptic="none"
                scaleDown={0.95}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isActive ? "#007AFF" : "#ddd",
                  backgroundColor: isActive ? "#007AFF" : "#fff",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: isActive ? "#fff" : "#333",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {m.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Period selector */}
        <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
          ¿Cada cuánto?
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          {PERIODS.map((p) => {
            const isActive = p.value === period;
            return (
              <AnimatedPressable
                key={p.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPeriod(p.value);
                }}
                haptic="none"
                scaleDown={0.95}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isActive ? "#007AFF" : "#ddd",
                  backgroundColor: isActive ? "#007AFF" : "#fff",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: isActive ? "#fff" : "#333",
                    fontWeight: isActive ? "600" : "400",
                  }}
                >
                  {p.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Target input */}
        <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 8 }}>
          Objetivo
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
            placeholder="20"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 12,
              fontSize: 18,
              textAlign: "center",
            }}
          />
          <Text style={{ fontSize: 15, color: "#666" }}>
            {metric === "minutes" ? "min" : "pág"} /{" "}
            {period === "daily" ? "día" : "semana"}
          </Text>
        </View>

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          haptic="none"
          style={{
            backgroundColor: isValid ? "#34C759" : "#a0d8a8",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Guardar objetivo
          </Text>
        </AnimatedPressable>

        {/* Delete button (only if goal exists) */}
        {goal && (
          <AnimatedPressable
            onPress={handleDelete}
            haptic="none"
            scaleDown={0.97}
            style={{
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#FF3B30", fontWeight: "600", fontSize: 15 }}>
              Eliminar objetivo
            </Text>
          </AnimatedPressable>
        )}
      </View>
    </ScrollView>
  );
}
