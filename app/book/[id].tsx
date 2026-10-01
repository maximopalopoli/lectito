import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCover from "@/components/BookCover";
import ReviewModal from "@/components/ReviewModal";
import StarRating from "@/components/StarRating";
import TagBadge from "@/components/TagBadge";
import TagsModal from "@/components/TagsModal";
import { readingProgress } from "@/lib/progress";
import { changeStatusWithUndo, deleteBookWithUndo } from "@/lib/undoableActions";
import { useTheme } from "@/lib/theme";
import { useBooksStore } from "@/store/books";
import { useQuotesStore } from "@/store/quotes";
import { useReaderSettingsStore } from "@/store/readerSettings";
import { useSessionsStore } from "@/store/sessions";
import type { BookStatus, QuoteColor } from "@/types";

const COLOR_HEX: Record<QuoteColor, string> = {
  yellow: '#FBBF24',
  blue: '#60A5FA',
  green: '#34D399',
  pink: '#F472B6',
  purple: '#A78BFA',
};

const STATUS_LABEL: Record<BookStatus, string> = {
  TBR: "Quiero leer",
  READING: "Leyendo",
  DONE: "Leído",
  DNF: "Abandonado",
};

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const books = useBooksStore((s) => s.books);
  const updateBook = useBooksStore((s) => s.updateBook);
  const changeStatus = useBooksStore((s) => s.changeStatus);
  const allSessions = useSessionsStore((s) => s.sessions);
  const allQuotes = useQuotesStore((s) => s.quotes);

  const book = useMemo(() => books.find((b) => b.id === id), [books, id]);
  const readerPosition = useReaderSettingsStore((s) => (id ? s.positions[id] : undefined));
  const sessions = useMemo(() => allSessions.filter((s) => s.bookId === id), [allSessions, id]);
  const quotes = useMemo(
    () =>
      allQuotes
        .filter((q) => q.bookId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allQuotes, id],
  );

  const [pageInput, setPageInput] = useState("");
  const [showPageInput, setShowPageInput] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<"complete" | "edit">("complete");
  const [showTagsModal, setShowTagsModal] = useState(false);

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Libro no encontrado</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/library"));
  const hasEpub = Boolean(book.epubUri);
  const openReader = () => router.push({ pathname: "/book/reader", params: { bookId: book.id } });

  // Sin confirmación previa: se aplica al instante y el toast ofrece "Deshacer".
  const handleDelete = () => {
    deleteBookWithUndo(book.id);
    goBack();
  };

  const handleAbandon = () => {
    changeStatusWithUndo(book.id, "DNF", `Moviste “${book.title}” a Abandonados`);
  };

  const progress = readingProgress(book, readerPosition);

  const handleSavePage = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= book.currentPage && page <= book.pageCount) {
      updateBook(book.id, { currentPage: page });
      setPageInput("");
      setShowPageInput(false);
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
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingHorizontal: 8,
          paddingBottom: 4,
        }}
      >
        <HeaderIconButton icon="chevron-back" label="Volver" onPress={goBack} />
        <HeaderIconButton
          icon="share-outline"
          label="Compartir card del libro"
          onPress={() => router.push({ pathname: "/book/share", params: { bookId: book.id } })}
        />
      </View>

      {/* Cover */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <BookCover uri={book.coverUrl} width={140} height={210} radius={8} />
      </View>

      {/* Info */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", textAlign: "center", color: colors.textPrimary }}>
          {book.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {book.authors.join(", ")}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          <InfoChip label="Estado" value={STATUS_LABEL[book.status]} />
          {/* El "conteo de páginas" de un ePub son locations de epub.js, no páginas reales. */}
          {book.epubUri ? (
            <InfoChip label="Formato" value="ePub" />
          ) : (
            <InfoChip label="Páginas" value={String(book.pageCount)} />
          )}
          {book.isbn13 && <InfoChip label="ISBN" value={book.isbn13} />}
        </View>

        <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Agregado el {formatDate(book.addedAt)}
        </Text>

        {/* Progress */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontWeight: "600", fontSize: 15, color: colors.textPrimary, marginBottom: 8 }}>
            Progreso
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: colors.track,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${progress.percent}%`,
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
            {progress.byPercent
              ? `${progress.percent}% leído${progress.chapter ? ` · ${progress.chapter}` : ""}`
              : `Página ${book.currentPage} de ${book.pageCount} (${progress.percent}%)`}
          </Text>
        </View>

        {/* Update progress input */}
        {showPageInput && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              gap: 8,
            }}
          >
            <TextInput
              value={pageInput}
              onChangeText={setPageInput}
              placeholder={`Página actual (${book.currentPage}-${book.pageCount})`}
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                fontSize: 15,
                color: colors.textPrimary,
              }}
            />
            <Pressable
              onPress={handleSavePage}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: "600" }}>Guardar</Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={{ marginTop: 24, gap: 10 }}>
          {/* Con ePub, leer en la app es la acción principal: el lector ya registra la sesión. */}
          {hasEpub && (book.status === "TBR" || book.status === "READING") && (
            <ActionButton
              icon="reader-outline"
              label={book.status === "TBR" && progress.percent === 0 ? "Empezar a leer el ePub" : "Seguir leyendo el ePub"}
              onPress={openReader}
            />
          )}

          {book.status === "TBR" && !hasEpub && (
            <ActionButton
              icon="book-outline"
              label="Empezar a leer"
              onPress={() => changeStatus(book.id, "READING")}
            />
          )}

          {book.status === "READING" && (
            <>
              <ActionButton
                variant={hasEpub ? "secondary" : "primary"}
                icon={hasEpub ? "timer-outline" : "play"}
                label={hasEpub ? "Sesión con temporizador" : "Iniciar sesión de lectura"}
                onPress={() => router.push(`/session/${book.id}`)}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* En un ePub el avance lo registra el lector; no hay "página" que cargar a mano. */}
                {!hasEpub && (
                  <ActionButton
                    variant="secondary"
                    icon="create-outline"
                    label="Progreso"
                    onPress={() => setShowPageInput(!showPageInput)}
                  />
                )}
                <ActionButton
                  variant="secondary"
                  icon="checkmark-circle-outline"
                  label="Terminado"
                  onPress={() => {
                    setReviewMode("complete");
                    setShowReviewModal(true);
                  }}
                />
              </View>
            </>
          )}

          {hasEpub && (book.status === "DONE" || book.status === "DNF") && (
            <ActionButton variant="secondary" icon="reader-outline" label="Leer ePub" onPress={openReader} />
          )}

          {(book.status === "DONE" || book.status === "DNF") && (
            <ActionButton
              variant="secondary"
              icon="refresh"
              label={book.status === "DONE" ? "Volver a leer" : "Retomar"}
              onPress={() => {
                updateBook(book.id, { currentPage: 0 });
                changeStatus(book.id, "READING");
              }}
            />
          )}
        </View>

        {/* Rating & Review */}
        {book.status === "DONE" && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", fontSize: 15, color: colors.textPrimary, marginBottom: 10 }}>
              Mi reseña
            </Text>
            {book.rating != null ? (
              <View style={{ marginBottom: 8 }}>
                <StarRating rating={book.rating} readonly size={24} />
              </View>
            ) : (
              <Text style={{ color: colors.textTertiary, fontSize: 13, marginBottom: 8 }}>
                Sin calificación
              </Text>
            )}
            {book.review ? (
              <Text style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 20, fontStyle: "italic" }}>
                {book.review}
              </Text>
            ) : (
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                Sin reseña
              </Text>
            )}
            <Pressable
              onPress={() => {
                setReviewMode("edit");
                setShowReviewModal(true);
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                {book.rating != null || book.review ? "Editar reseña" : "Agregar reseña"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Tags */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600", fontSize: 15, color: colors.textPrimary }}>Etiquetas</Text>
            <Pressable onPress={() => setShowTagsModal(true)}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                {(book.tags ?? []).length > 0 ? "Editar" : "+ Agregar"}
              </Text>
            </Pressable>
          </View>
          {(book.tags ?? []).length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {book.tags.map((tag) => (
                <TagBadge key={tag} label={tag} />
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
              Sin etiquetas
            </Text>
          )}
        </View>

        {/* Session history */}
        {sessions.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontWeight: "600", fontSize: 15, color: colors.textPrimary, marginBottom: 10 }}>
              Historial de sesiones
            </Text>
            {sessions
              .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
              .map((session) => (
                <View
                  key={session.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {formatDate(session.startedAt)}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textPrimary }}>
                      {session.durationMin} min
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                    {session.pagesRead} páginas leídas
                  </Text>
                  {session.note && (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" }}>
                      {session.note}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Quotes section */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600", fontSize: 15, color: colors.textPrimary }}>
              Citas{quotes.length > 0 ? ` (${quotes.length})` : ""}
            </Text>
            <AnimatedPressable
              onPress={() =>
                router.push({ pathname: "/book/quote-form", params: { bookId: book.id } })
              }
              haptic="light"
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>
                + Agregar
              </Text>
            </AnimatedPressable>
          </View>

          {quotes.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: 10,
                padding: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{"\u201C\u201D"}</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 13, textAlign: "center" }}>
                Guarda citas y pasajes memorables de este libro.
              </Text>
            </View>
          ) : (
            <>
              {quotes.slice(0, 3).map((quote) => (
                <Pressable
                  key={quote.id}
                  onPress={() =>
                    router.push({
                      pathname: "/book/quote-form",
                      params: { bookId: book.id, quoteId: quote.id },
                    })
                  }
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: COLOR_HEX[quote.color],
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontStyle: "italic", lineHeight: 20, color: colors.textPrimary }}
                    numberOfLines={3}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </Text>
                  {quote.pageNumber != null && (
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
                      Pag. {quote.pageNumber}
                    </Text>
                  )}
                </Pressable>
              ))}
              {quotes.length > 3 && (
                <AnimatedPressable
                  onPress={() =>
                    router.push({ pathname: "/book/quotes", params: { bookId: book.id } })
                  }
                  haptic="light"
                  style={{
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 14 }}>
                    Ver todas ({quotes.length})
                  </Text>
                </AnimatedPressable>
              )}
            </>
          )}
        </View>

        {/* Low-emphasis / destructive actions */}
        <View style={{ marginTop: 32, alignItems: "center", gap: 4 }}>
          {book.status === "READING" && (
            <TextButton label="Abandonar libro" color={colors.textSecondary} onPress={handleAbandon} />
          )}
          <TextButton label="Eliminar de la biblioteca" color={colors.danger} onPress={handleDelete} />
        </View>
      </View>

      <TagsModal
        visible={showTagsModal}
        bookId={book.id}
        bookTags={book.tags ?? []}
        onSave={(tags) => {
          updateBook(book.id, { tags });
          setShowTagsModal(false);
        }}
        onClose={() => setShowTagsModal(false)}
      />

      <ReviewModal
        visible={showReviewModal}
        initialRating={book.rating}
        initialReview={book.review}
        onSave={(rating, review) => {
          if (reviewMode === "complete") {
            updateBook(book.id, { currentPage: book.pageCount, rating, review });
            changeStatus(book.id, "DONE");
          } else {
            updateBook(book.id, { rating, review });
          }
          setShowReviewModal(false);
        }}
        onSkip={() => {
          if (reviewMode === "complete") {
            updateBook(book.id, { currentPage: book.pageCount });
            changeStatus(book.id, "DONE");
          }
          setShowReviewModal(false);
        }}
      />
    </ScrollView>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 11, color: colors.textTertiary, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 2, color: colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  variant = "primary",
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const colors = useTheme();
  const isPrimary = variant === "primary";
  const fg = isPrimary ? colors.onPrimary : colors.primary;
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      haptic="medium"
      style={{
        flex: isPrimary ? undefined : 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        minHeight: isPrimary ? 52 : 46,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: isPrimary ? colors.primary : colors.surface,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name={icon} size={isPrimary ? 20 : 18} color={fg} />
      <Text style={{ color: fg, fontWeight: "600", fontSize: isPrimary ? 16 : 15 }}>{label}</Text>
    </AnimatedPressable>
  );
}

function TextButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: "center" }}
    >
      <Text style={{ color, fontSize: 14, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
    </Pressable>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}
