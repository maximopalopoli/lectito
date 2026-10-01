import { useEffect } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { darkColors, fontSize, fontWeight, lightColors, radius, spacing } from "@/lib/theme";
import { TOAST_DURATION_MS, useToastStore } from "@/lib/toast";

/** Snackbar global (se monta una vez en el layout raíz). Va por encima de la tab bar. */
export default function Toast() {
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  // Colores invertidos respecto del tema, como los snackbars del sistema.
  const inverted = useColorScheme() === "dark" ? lightColors : darkColors;

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => hide(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast, hide]);

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 72, alignItems: "center" }}
    >
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(150)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          flexDirection: "row",
          alignItems: "center",
          maxWidth: 480,
          marginHorizontal: spacing.lg,
          paddingLeft: spacing.lg,
          paddingRight: toast.actionLabel ? spacing.xs : spacing.lg,
          minHeight: 48,
          borderRadius: radius.lg,
          backgroundColor: inverted.surface,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text
          style={{ flexShrink: 1, color: inverted.textPrimary, fontSize: fontSize.md, paddingVertical: spacing.md }}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
        {toast.actionLabel && (
          <Pressable
            onPress={() => {
              toast.onAction?.();
              hide(toast.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, marginLeft: spacing.sm }}
          >
            <Text style={{ color: inverted.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
