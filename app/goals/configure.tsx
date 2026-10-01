import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import ScreenHeader from "@/components/ScreenHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { useTheme } from "@/lib/theme";
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
  const colors = useTheme();
  const { goal, setGoal, clearGoal } = useGoalsStore();

  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "minutes");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "daily");
  const [target, setTarget] = useState(goal?.target?.toString() ?? "");

  const parsedTarget = parseInt(target, 10);
  const isValid = !isNaN(parsedTarget) && parsedTarget > 0;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/stats");
  };

  const handleSave = () => {
    if (!isValid) return;
    setGoal({ metric, period, target: parsedTarget });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    leave();
  };

  const handleDelete = () => {
    clearGoal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    leave();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title={goal ? "Editar objetivo" : "Nuevo objetivo"} fallbackHref="/stats" />

      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        {/* Metric selector */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
          ¿Qué querés medir?
        </Text>
        <View style={{ marginBottom: 24 }}>
          <SegmentedControl options={METRICS} value={metric} onChange={setMetric} accessibilityLabel="Métrica" />
        </View>

        {/* Period selector */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
          ¿Cada cuánto?
        </Text>
        <View style={{ marginBottom: 24 }}>
          <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} accessibilityLabel="Período" />
        </View>

        {/* Target input */}
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
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
            onChangeText={(t) => setTarget(t.replace(/[^0-9]/g, ""))}
            accessibilityLabel="Objetivo"
            keyboardType="number-pad"
            placeholder="20"
            placeholderTextColor={colors.textTertiary}
            style={{
              width: 110,
              backgroundColor: colors.surface,
              borderRadius: 10,
              paddingVertical: 12,
              fontSize: 22,
              fontWeight: "600",
              color: colors.textPrimary,
              textAlign: "center",
            }}
          />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {metric === "minutes" ? "min" : "pág"} /{" "}
            {period === "daily" ? "día" : "semana"}
          </Text>
        </View>

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          haptic="none"
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
          style={{
            backgroundColor: colors.primary,
            opacity: isValid ? 1 : 0.4,
            minHeight: 50,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 16 }}>
            Guardar objetivo
          </Text>
        </AnimatedPressable>

        {/* Delete button (only if goal exists) */}
        {goal && (
          <AnimatedPressable
            onPress={handleDelete}
            haptic="none"
            scaleDown={0.97}
            accessibilityRole="button"
            style={{
              minHeight: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 15 }}>
              Eliminar objetivo
            </Text>
          </AnimatedPressable>
        )}
      </View>
    </ScrollView>
  );
}
