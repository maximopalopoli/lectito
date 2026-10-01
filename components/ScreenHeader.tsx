import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { darkColors, useTheme } from "@/lib/theme";

/**
 * Header de pantallas apiladas: flecha de volver, título y una acción opcional
 * a la derecha. Incluye el inset superior del área segura.
 *
 * Sin `onBack`, vuelve atrás en el stack o, si no hay historial (deep link /
 * recarga en web), reemplaza por `fallbackHref`.
 */
export default function ScreenHeader({
  title,
  onBack,
  backLabel = "Volver",
  fallbackHref = "/",
  right,
  dark = false,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  fallbackHref?: Href;
  right?: ReactNode;
  /** Usa la paleta oscura sin importar el tema (pantallas de compartir, siempre negras). */
  dark?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const colors = dark ? darkColors : themeColors;

  const goBack =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace(fallbackHref);
    });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: insets.top + 8,
        paddingHorizontal: 8,
        paddingBottom: 8,
        minHeight: insets.top + 60,
      }}
    >
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={4}
        style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 20,
          fontWeight: "bold",
          color: colors.textPrimary,
          marginLeft: 4,
        }}
      >
        {title ?? ""}
      </Text>
      {right ? <View style={{ marginLeft: 8, marginRight: 4 }}>{right}</View> : null}
    </View>
  );
}
