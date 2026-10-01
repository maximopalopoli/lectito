import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import { useTheme } from "@/lib/theme";

/** Botón redondo de 44px con ícono, para acciones secundarias en headers de pantalla. */
export default function CircleIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      haptic="light"
      scaleDown={0.9}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
    </AnimatedPressable>
  );
}
