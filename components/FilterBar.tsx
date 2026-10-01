import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/lib/theme";

interface FilterBarProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  minRating: number | null;
  onChangeRating: (rating: number | null) => void;
  onClear: () => void;
}

export default function FilterBar({
  availableTags,
  selectedTags,
  onToggleTag,
  minRating,
  onChangeRating,
  onClear,
}: FilterBarProps) {
  const colors = useTheme();
  const hasActiveFilters = selectedTags.length > 0 || minRating != null;

  return (
    <View style={{ gap: 10 }}>
      {/* Rating filter */}
      <View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: "600" }}>
          Rating mínimo
        </Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar desde ${star} estrellas`}
              accessibilityState={{ selected: minRating === star }}
              onPress={() => {
                Haptics.selectionAsync();
                onChangeRating(minRating === star ? null : star);
              }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name={minRating != null && star <= minRating ? "star" : "star-outline"}
                size={24}
                color={minRating != null && star <= minRating ? "#FFB800" : colors.icon}
              />
            </Pressable>
          ))}
          {minRating != null && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 6, alignSelf: "center" }}>
              {minRating}+ estrellas
            </Text>
          )}
        </View>
      </View>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: "600" }}>
            Tags
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por etiqueta ${tag}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleTag(tag);
                  }}
                  style={{
                    backgroundColor: isSelected ? colors.tagText : colors.tagBg,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: isSelected ? colors.onPrimary : colors.tagText,
                      fontWeight: isSelected ? "600" : "400",
                    }}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Clear button */}
      {hasActiveFilters && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpiar filtros"
          onPress={() => {
            Haptics.selectionAsync();
            onClear();
          }}
          style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 44 }}
        >
          <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
          <Text style={{ fontSize: 13, color: colors.danger, marginLeft: 4 }}>
            Limpiar filtros
          </Text>
        </Pressable>
      )}
    </View>
  );
}
