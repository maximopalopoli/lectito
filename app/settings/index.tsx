import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import ScreenHeader from "@/components/ScreenHeader";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
import { MAX_NAME_LENGTH, useProfileStore } from "@/store/profile";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const savedName = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  // Borrador local: se guarda al terminar de editar, así se pueden tipear espacios.
  const [draft, setDraft] = useState(savedName ?? "");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader title="Ajustes" />

      <View style={{ paddingHorizontal: spacing.xl }}>
        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm }}>
          Tu nombre
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onEndEditing={() => setName(draft)}
          onBlur={() => setName(draft)}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Tu nombre"
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="done"
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
          Aparece en el saludo de Inicio. Dejalo vacío si preferís no usarlo.
        </Text>

        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm }}>
          Datos
        </Text>
        <AnimatedPressable
          onPress={() => router.push("/settings/backup")}
          haptic="light"
          scaleDown={0.98}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            minHeight: 56,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
          }}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.textPrimary }}>
              Backup de datos
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
              Exportá o restaurá tus libros, sesiones y citas
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}
