import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

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
  const hasActiveFilters = selectedTags.length > 0 || minRating != null;

  return (
    <View style={{ gap: 10 }}>
      {/* Rating filter */}
      <View>
        <Text style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: "600" }}>
          Rating mínimo
        </Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => {
                Haptics.selectionAsync();
                onChangeRating(minRating === star ? null : star);
              }}
              hitSlop={4}
            >
              <Ionicons
                name={minRating != null && star <= minRating ? "star" : "star-outline"}
                size={24}
                color={minRating != null && star <= minRating ? "#FFB800" : "#ccc"}
              />
            </Pressable>
          ))}
          {minRating != null && (
            <Text style={{ fontSize: 13, color: "#666", marginLeft: 6, alignSelf: "center" }}>
              {minRating}+ estrellas
            </Text>
          )}
        </View>
      </View>

      {/* Tags filter */}
      {availableTags.length > 0 && (
        <View>
          <Text style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: "600" }}>
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
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleTag(tag);
                  }}
                  style={{
                    backgroundColor: isSelected ? "#1A73E8" : "#E8F0FE",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: isSelected ? "#fff" : "#1A73E8",
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
          onPress={() => {
            Haptics.selectionAsync();
            onClear();
          }}
          style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start" }}
        >
          <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
          <Text style={{ fontSize: 13, color: "#FF3B30", marginLeft: 4 }}>
            Limpiar filtros
          </Text>
        </Pressable>
      )}
    </View>
  );
}
