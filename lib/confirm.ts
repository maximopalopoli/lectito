import { Alert, Platform } from "react-native";

/** Pide confirmación en nativo; en web (donde `Alert` no hace nada) ejecuta directo. */
export function confirmThen(title: string, message: string, confirmText: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: confirmText, style: "destructive", onPress: onConfirm },
  ]);
}
