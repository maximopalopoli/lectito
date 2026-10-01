import { useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import AnimatedPressable from "@/components/AnimatedPressable";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/lib/theme";
import { exportBackup, importBackup } from "@/lib/backup";

export default function BackupScreen() {
  const colors = useTheme();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  const handleExport = async (destination: "share" | "save") => {
    if (exporting) return;
    setExporting(true);
    setMessage(null);
    try {
      const saved = await exportBackup(destination);
      if (!saved) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage({
        kind: "success",
        text: destination === "save"
          ? "Backup guardado en la carpeta elegida"
          : Platform.OS === "web"
            ? "Descarga iniciada"
            : "Se abrió el menú para compartir. Comprobá que hayas guardado el archivo.",
      });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Error al exportar" });
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
        setMessage({
          kind: "success",
          text:
            `Restaurado: ${result.books} libros y ${result.sessions} sesiones` +
            (result.missingEpubs > 0
              ? `. ${result.missingEpubs} ePub no estaban incluidos en este backup antiguo; volvé a importarlos.`
              : ""),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al importar";
        if (msg !== "Cancelado") {
          setMessage({ kind: "error", text: msg });
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
      <ScreenHeader title="Backup" />

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 }}>
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
            Genera un archivo JSON con tus libros, ePub, sesiones, citas y ajustes.
          </Text>
          <AnimatedPressable
            onPress={() => handleExport(Platform.OS === "android" ? "save" : "share")}
            haptic="none"
            disabled={exporting}
            style={{
              backgroundColor: colors.primary,
              opacity: exporting ? 0.5 : 1,
              minHeight: 48,
              justifyContent: "center",
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>
              {exporting ? "Exportando..." : Platform.OS === "android" ? "Guardar en el dispositivo" : "Exportar"}
            </Text>
          </AnimatedPressable>
          {Platform.OS === "android" && (
            <AnimatedPressable
              onPress={() => handleExport("share")}
              haptic="none"
              disabled={exporting}
              style={{ alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: 8 }}
            >
              <Text style={{ color: colors.primary, fontSize: 14 }}>Compartir archivo</Text>
            </AnimatedPressable>
          )}
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
            disabled={importing}
            style={{
              backgroundColor: colors.warning,
              opacity: importing ? 0.5 : 1,
              minHeight: 48,
              justifyContent: "center",
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
            accessibilityLiveRegion="polite"
            style={{
              marginTop: 20,
              padding: 14,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: message.kind === "error" ? colors.danger : colors.success,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Ionicons
              name={message.kind === "error" ? "alert-circle" : "checkmark-circle"}
              size={20}
              color={message.kind === "error" ? colors.danger : colors.success}
            />
            <Text style={{ flex: 1, fontSize: 14, color: colors.textPrimary }}>
              {message.text}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
