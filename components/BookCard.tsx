import { Image, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { Book } from "@/types";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
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
  const colors = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="light"
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        padding: 10,
        alignItems: "center",
      }}
    >
      {/* Cover */}
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={{ width: 48, height: 70, borderRadius: radius.sm }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 70,
            borderRadius: radius.sm,
            backgroundColor: colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: fontSize.xxl }}>📖</Text>
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base, color: colors.textPrimary }} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }} numberOfLines={1}>
          {book.authors.join(", ")}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
          {STATUS_LABEL[book.status]}
          {book.status === "READING" && book.pageCount > 0
            ? ` · ${book.currentPage}/${book.pageCount} (${Math.round((book.currentPage / book.pageCount) * 100)}%)`
            : ` · ${book.pageCount} pp`}
        </Text>
        {(book.tags ?? []).length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xs, gap: spacing.xs }}>
            {book.tags.slice(0, 3).map((tag) => (
              <Text
                key={tag}
                style={{
                  fontSize: 10,
                  color: colors.tagText,
                  backgroundColor: colors.tagBg,
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                {tag}
              </Text>
            ))}
            {book.tags.length > 3 && (
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>
                +{book.tags.length - 3}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Delete */}
      {onDelete && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${book.title}`}
          hitSlop={8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={{ padding: spacing.sm }}
        >
          <Text style={{ color: colors.dangerStrong, fontSize: fontSize.lg }}>✕</Text>
        </Pressable>
      )}
    </AnimatedPressable>
  );
}
