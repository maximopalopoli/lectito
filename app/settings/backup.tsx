import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import { useTheme } from "@/lib/theme";
import { exportBackup, importBackup } from "@/lib/backup";

export default function BackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      await exportBackup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage("Backup exportado correctamente");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    const doImport = async () => {
      setImporting(true);
      setMessage(null);
      try {
        const result = await importBackup();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMessage(
          `Restaurado: ${result.books} libros y ${result.sessions} sesiones` +
          (result.missingEpubs > 0
            ? `. ${result.missingEpubs} ePub no estaban incluidos en este backup antiguo; volvé a importarlos.`
            : ""),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al importar";
        if (msg !== "Cancelado") {
          setMessage(msg);
        }
      } finally {
        setImporting(false);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Esto reemplazará todos tus datos actuales. ¿Continuar?")) {
        doImport();
      }
    } else {
      Alert.alert(
        "Restaurar backup",
        "Esto reemplazará todos tus datos actuales. ¿Continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Restaurar", style: "destructive", onPress: doImport },
        ],
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Volver</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.textPrimary, marginBottom: 8 }}>
          Backup
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 32 }}>
          Exportá tus datos como JSON o restaurá desde un backup anterior.
        </Text>

        {/* Export */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="download-outline" size={22} color={colors.primary} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textPrimary,
                marginLeft: 8,
              }}
            >
              Exportar datos
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            Genera un archivo JSON con todos tus libros, sesiones y objetivo.
          </Text>
          <AnimatedPressable
            onPress={handleExport}
            haptic="none"
            style={{
              backgroundColor: exporting ? "#a0c4ff" : colors.primary,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>
              {exporting ? "Exportando..." : "Exportar"}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Import */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="push-outline" size={22} color={colors.warning} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textPrimary,
                marginLeft: 8,
              }}
            >
              Restaurar backup
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            Seleccioná un archivo JSON exportado previamente. Esto reemplazará
            todos los datos actuales.
          </Text>
          <AnimatedPressable
            onPress={handleImport}
            haptic="none"
            style={{
              backgroundColor: importing ? "#ffd699" : colors.warning,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>
              {importing ? "Importando..." : "Restaurar"}
            </Text>
          </AnimatedPressable>
        </View>

        {/* Feedback message */}
        {message && (
          <View
            style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: message.startsWith("Error")
                ? "#FFF0F0"
                : "#F0FFF0",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: message.startsWith("Error") ? colors.danger : colors.success,
                textAlign: "center",
              }}
            >
              {message}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
