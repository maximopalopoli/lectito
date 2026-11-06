import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
import { MAX_NAME_LENGTH, useProfileStore } from "@/store/profile";

/** Bienvenida de una sola pantalla: pide el nombre (opcional) y no vuelve a aparecer. */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const finishWelcome = useProfileStore((s) => s.finishWelcome);
  const [name, setName] = useState("");

  const finish = (value: string) => {
    finishWelcome(value);
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.xl,
        }}
      >
        <Ionicons name="book-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.lg }} />
        <Text
          accessibilityRole="header"
          style={{ fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.textPrimary }}
        >
          Te damos la bienvenida
        </Text>
        <Text style={{ fontSize: fontSize.base, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl }}>
          Lectito te ayuda a seguir lo que leés: tus libros, tus sesiones y tus citas favoritas.
        </Text>

        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm }}>
          ¿Cómo te llamás?
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Tu nombre"
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={() => finish(name)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            fontSize: fontSize.base,
            color: colors.textPrimary,
          }}
        />
        <Text style={{ fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.sm }}>
          Solo lo usamos para saludarte. Queda en este dispositivo y podés cambiarlo en Ajustes.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <AnimatedPressable
            onPress={() => finish(name)}
            haptic="medium"
            accessibilityRole="button"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.lg,
              minHeight: 50,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold }}>
              Empezar
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => finish("")}
            haptic="light"
            scaleDown={0.97}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
              Ahora no
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
