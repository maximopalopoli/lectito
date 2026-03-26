import { Image, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { Book } from "@/types";
import AnimatedPressable from "./AnimatedPressable";

interface BookCardProps {
  book: Book;
  onPress?: () => void;
  onDelete?: () => void;
}

const STATUS_LABEL: Record<Book["status"], string> = {
  TBR: "Quiero leer",
  READING: "Leyendo",
  DONE: "Leído",
  DNF: "Abandonado",
};

export default function BookCard({ book, onPress, onDelete }: BookCardProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="light"
      style={{
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderRadius: 10,
        marginBottom: 8,
        padding: 10,
        alignItems: "center",
      }}
    >
      {/* Cover */}
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={{ width: 48, height: 70, borderRadius: 4 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 70,
            borderRadius: 4,
            backgroundColor: "#ddd",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>📖</Text>
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={{ color: "#666", fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {book.authors.join(", ")}
        </Text>
        <Text style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
          {STATUS_LABEL[book.status]}
          {book.status === "READING" && book.pageCount > 0
            ? ` · ${book.currentPage}/${book.pageCount} (${Math.round((book.currentPage / book.pageCount) * 100)}%)`
            : ` · ${book.pageCount} pp`}
        </Text>
        {(book.tags ?? []).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 4 }}>
            {book.tags.slice(0, 3).map((tag) => (
              <Text
                key={tag}
                style={{
                  fontSize: 10,
                  color: "#1A73E8",
                  backgroundColor: "#E8F0FE",
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                {tag}
              </Text>
            ))}
            {book.tags.length > 3 && (
              <Text style={{ fontSize: 10, color: "#999" }}>
                +{book.tags.length - 3}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Delete */}
      {onDelete && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={{ padding: 8 }}
        >
          <Text style={{ color: "#c00", fontSize: 16 }}>✕</Text>
        </Pressable>
      )}
    </AnimatedPressable>
  );
}
