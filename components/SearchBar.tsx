import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar libro...",
}: SearchBarProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 0,
        minHeight: 44,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={colors.textTertiary}
        style={{ marginRight: 8 }}
      />
      <TextInput
        accessibilityLabel="Buscar libros por título o autor"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCorrect={false}
        style={{ flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 }}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChangeText("")}
          style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}
