import { useRef, useCallback } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";

interface BarcodeScannerProps {
  onScanned: (isbn: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onScanned,
  onClose,
}: BarcodeScannerProps) {
  const colors = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      onScanned(data);
    },
    [onScanned],
  );

  // Pantallas previas a la cámara: siguen el tema de la app (la vista de cámara queda oscura).
  if (!permission || !permission.granted) {
    // Si ya se negó sin opción de volver a preguntar, el sistema no muestra el diálogo: hay que ir a Ajustes.
    const blocked = !!permission && !permission.canAskAgain;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {!permission ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>Cargando cámara…</Text>
        ) : (
          <>
            <Ionicons name="camera-outline" size={48} color={colors.icon} style={{ marginBottom: spacing.md }} />
            <Text style={[styles.message, { color: colors.textPrimary }]}>
              {blocked
                ? "El acceso a la cámara está desactivado. Activalo desde los ajustes para escanear códigos de barras."
                : "Aleph necesita acceso a la cámara para escanear códigos de barras."}
            </Text>
            <Pressable
              onPress={blocked ? () => void Linking.openSettings() : requestPermission}
              accessibilityRole="button"
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.permissionButtonText, { color: colors.onPrimary }]}>
                {blocked ? "Abrir ajustes" : "Permitir cámara"}
              </Text>
            </Pressable>
          </>
        )}
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: colors.primary }]}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8"],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlayFill} />

        {/* Middle row with cutout */}
        <View style={styles.middleRow}>
          <View style={styles.overlayFill} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlayFill} />
        </View>

        {/* Instructions */}
        <View style={styles.bottomSection}>
          <Text style={styles.hint}>
            Apuntá la cámara al código de barras del libro
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const SCAN_AREA_SIZE = 280;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  message: {
    fontSize: fontSize.lg,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  permissionButton: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  permissionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  cancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayFill: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  middleRow: {
    flexDirection: "row",
    height: SCAN_AREA_SIZE,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#fff",
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#fff",
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "#fff",
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "#fff",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  hint: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
