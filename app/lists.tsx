import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AnimatedPressable from "@/components/AnimatedPressable";
import BookCard from "@/components/BookCard";
import ScreenHeader from "@/components/ScreenHeader";
import { useTheme } from "@/lib/theme";
import { deleteListWithUndo } from "@/lib/undoableActions";
import { useBooksStore } from "@/store/books";
import { useListsStore } from "@/store/lists";

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const books = useBooksStore((s) => s.books);
  const lists = useListsStore((s) => s.lists);
  const createList = useListsStore((s) => s.createList);
  const renameList = useListsStore((s) => s.renameList);
  const toggleBook = useListsStore((s) => s.toggleBook);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nameMode, setNameMode] = useState<"create" | "rename" | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [bookQuery, setBookQuery] = useState("");

  const selectedList = lists.find((list) => list.id === selectedId);
  const listedBooks = useMemo(
    () => selectedList?.bookIds.flatMap((id) => {
      const book = books.find((item) => item.id === id);
      return book ? [book] : [];
    }) ?? [],
    [books, selectedList],
  );
  const pickerBooks = useMemo(() => {
    const query = bookQuery.trim().toLocaleLowerCase();
    return [...books]
      .sort((a, b) => a.title.localeCompare(b.title))
      .filter((book) => !query || book.title.toLocaleLowerCase().includes(query) ||
        book.authors.some((author) => author.toLocaleLowerCase().includes(query)));
  }, [books, bookQuery]);

  function openNameModal(mode: "create" | "rename") {
    setNameMode(mode);
    setNameDraft(mode === "rename" ? selectedList?.name ?? "" : "");
    setNameError(null);
  }

  function saveName() {
    const result = nameMode === "create"
      ? createList(nameDraft)
      : selectedList && renameList(selectedList.id, nameDraft);
    if (!result) {
      setNameError("Escribí un nombre de hasta 60 caracteres que no esté en uso.");
      return;
    }
    if (typeof result === "string") setSelectedId(result);
    setNameMode(null);
  }

  function confirmDelete() {
    if (!selectedList) return;
    deleteListWithUndo(selectedList.id);
    setSelectedId(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ marginBottom: 12 }}>
        <ScreenHeader
          title={selectedList?.name ?? "Mis listas"}
          onBack={selectedList ? () => setSelectedId(null) : undefined}
          backLabel={selectedList ? "Volver a mis listas" : "Volver a biblioteca"}
          fallbackHref="/library"
        />
      </View>

      {selectedList ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
            {listedBooks.length} libro{listedBooks.length !== 1 ? "s" : ""} · independiente de los estantes
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            <AnimatedPressable onPress={() => { setBookQuery(""); setShowBookPicker(true); }} haptic="light"
              accessibilityRole="button"
              style={{ flex: 1, flexDirection: "row", gap: 6, backgroundColor: colors.primary, borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add" size={20} color={colors.onPrimary} />
              <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>Agregar libros</Text>
            </AnimatedPressable>
            <Pressable onPress={() => openNameModal("rename")} accessibilityRole="button"
              style={{ paddingHorizontal: 14, minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Renombrar</Text>
            </Pressable>
          </View>

          {listedBooks.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 55, paddingHorizontal: 16 }}>
              <Ionicons name="albums-outline" size={48} color={colors.icon} />
              <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "600", marginTop: 12 }}>La lista está vacía</Text>
              <Text style={{ color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>
                Tocá «Agregar libros» para sumar libros de tu biblioteca.
              </Text>
            </View>
          ) : listedBooks.map((book) => (
            <View key={book.id} style={{ marginBottom: 8 }}>
              <BookCard book={book} onPress={() => router.push(`/book/${book.id}`)} />
              <Pressable onPress={() => toggleBook(selectedList.id, book.id)}
                accessibilityRole="button" accessibilityLabel={`Quitar ${book.title} de ${selectedList.name}`}
                style={{ alignSelf: "flex-end", paddingHorizontal: 10, minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>Quitar de la lista</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={confirmDelete} accessibilityRole="button"
            style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", minHeight: 48, marginTop: 16 }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 15 }}>Eliminar lista</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 18 }}>
            Organizá libros en colecciones propias sin cambiar su estado de lectura.
          </Text>
          <AnimatedPressable onPress={() => openNameModal("create")} haptic="light" accessibilityRole="button"
            style={{ flexDirection: "row", gap: 6, backgroundColor: colors.primary, borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Ionicons name="add" size={20} color={colors.onPrimary} />
            <Text style={{ color: colors.onPrimary, fontWeight: "600", fontSize: 15 }}>Nueva lista</Text>
          </AnimatedPressable>
          {lists.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 45, paddingHorizontal: 16 }}>
              <Ionicons name="albums-outline" size={48} color={colors.icon} />
              <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: "600", marginTop: 12 }}>Todavía no tenés listas</Text>
              <Text style={{ color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>
                Por ejemplo: «Para regalar», «Club de lectura» o «Verano».
              </Text>
            </View>
          ) : lists.map((list) => (
            <Pressable key={list.id} onPress={() => setSelectedId(list.id)} accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 18, marginBottom: 10 }}>
              <Ionicons name="albums-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "600" }}>{list.name}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                  {list.bookIds.length} libro{list.bookIds.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Modal visible={nameMode !== null} transparent animationType="fade" onRequestClose={() => setNameMode(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              {nameMode === "create" ? "Nueva lista" : "Renombrar lista"}
            </Text>
            <TextInput value={nameDraft} onChangeText={(value) => { setNameDraft(value); setNameError(null); }}
              placeholder="Nombre de la lista" placeholderTextColor={colors.textTertiary} maxLength={60}
              accessibilityLabel="Nombre de la lista" returnKeyType="done" onSubmitEditing={saveName}
              autoFocus style={{ color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16 }} />
            {nameError && <Text style={{ color: colors.danger, marginTop: 8 }}>{nameError}</Text>}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => setNameMode(null)} accessibilityRole="button"
                style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={saveName} disabled={!nameDraft.trim()} accessibilityRole="button"
                accessibilityState={{ disabled: !nameDraft.trim() }}
                style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", opacity: nameDraft.trim() ? 1 : 0.4 }}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 15 }}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showBookPicker} animationType="slide" onRequestClose={() => setShowBookPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700" }}>Libros de la lista</Text>
            <Pressable onPress={() => setShowBookPicker(false)} accessibilityRole="button"
              style={{ minHeight: 44, paddingLeft: 12, justifyContent: "center" }}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "600" }}>Listo</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, paddingLeft: 12, minHeight: 44, borderRadius: 10, backgroundColor: colors.surface }}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput value={bookQuery} onChangeText={setBookQuery} placeholder="Buscar por título o autor"
              placeholderTextColor={colors.textTertiary} accessibilityLabel="Buscar libro"
              style={{ flex: 1, minWidth: 0, paddingHorizontal: 8, paddingVertical: 10, fontSize: 16, color: colors.textPrimary }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {pickerBooks.map((book) => {
              const checked = selectedList?.bookIds.includes(book.id) ?? false;
              return (
                <Pressable key={book.id} onPress={() => selectedList && toggleBook(selectedList.id, book.id)}
                  accessibilityRole="checkbox" accessibilityState={{ checked }}
                  style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider, paddingVertical: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "600" }}>{book.title}</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{book.authors.join(", ")}</Text>
                  </View>
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={23} color={checked ? colors.primary : colors.textTertiary} />
                </Pressable>
              );
            })}
            {pickerBooks.length === 0 && <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 35 }}>No hay libros para mostrar.</Text>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
