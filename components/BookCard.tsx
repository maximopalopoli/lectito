import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Book } from "@/types";
import { fontSize, fontWeight, radius, spacing, useTheme } from "@/lib/theme";
import AnimatedPressable from "./AnimatedPressable";
import BookCover from "./BookCover";

interface BookCardProps {
  book: Book;
  onPress?: () => void;
  /** Mostrar el estante; innecesario cuando la lista ya es de un solo estante. */
  showStatus?: boolean;
}

const STATUS_LABEL: Record<Book["status"], string> = {
  TBR: "Quiero leer",
  READING: "Leyendo",
  DONE: "Leído",
  DNF: "Abandonado",
};

export default function BookCard({ book, onPress, showStatus = true }: BookCardProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
        alignItems: "center",
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${book.title}, ${book.authors.join(", ")}, ${STATUS_LABEL[book.status]}`}
        haptic="light"
        style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: 10 }}
      >
        {/* Cover */}
        <BookCover uri={book.coverUrl} width={48} height={70} radius={radius.sm} />

        {/* Info */}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base, color: colors.textPrimary }} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }} numberOfLines={1}>
          {book.authors.join(", ")}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
          {[
            showStatus ? STATUS_LABEL[book.status] : null,
            book.status === "READING" && book.pageCount > 0
              ? `${book.currentPage}/${book.pageCount} pp · ${Math.round((book.currentPage / book.pageCount) * 100)}%`
              : book.pageCount > 0
                ? `${book.pageCount} pp`
                : null,
          ]
            .filter(Boolean)
            .join(" · ")}
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
        <Ionicons name="chevron-forward" size={18} color={colors.icon} style={{ marginLeft: spacing.sm }} />
      </AnimatedPressable>

    </View>
  );
}
