import { Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import { radius, useTheme } from "@/lib/theme";

/** Selector de una opción entre pocas (2–4), estilo control segmentado. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(option.value);
            }}
            haptic="none"
            scaleDown={0.95}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            style={{
              flex: 1,
              minHeight: 40,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: radius.md,
              backgroundColor: isActive ? colors.primary : "transparent",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                color: isActive ? colors.onPrimary : colors.textSecondary,
                fontWeight: isActive ? "600" : "500",
              }}
            >
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
