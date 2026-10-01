import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove, type NavigationAction } from "@react-navigation/native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";

import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";
import { useQuotesStore } from "@/store/quotes";
import { useReaderSettingsStore } from "@/store/readerSettings";
import { readEpubAsBase64 } from "@/lib/epubStorage";
import { getBundledReaderHtml } from "@/lib/readerAssets";
import type { QuoteColor, ReaderThemeName } from "@/types";

const COLOR_OPTIONS: { color: QuoteColor; hex: string }[] = [
  { color: "yellow", hex: "#FBBF24" },
  { color: "blue", hex: "#60A5FA" },
  { color: "green", hex: "#34D399" },
  { color: "pink", hex: "#F472B6" },
  { color: "purple", hex: "#A78BFA" },
];

const THEME_OPTIONS: { label: string; theme: ReaderThemeName; bg: string; fg: string }[] = [
  { label: "Claro", theme: "light", bg: "#ffffff", fg: "#1a1a1a" },
  { label: "Oscuro", theme: "dark", bg: "#1a1a1a", fg: "#e0e0e0" },
  { label: "Sepia", theme: "sepia", bg: "#f4ecd8", fg: "#5b4636" },
];

const FONT_OPTIONS = [
  { label: "Default", value: "default" as const },
  { label: "Serif", value: "serif" as const },
  { label: "Sans", value: "sans-serif" as const },
  { label: "Mono", value: "monospace" as const },
];

interface TocItem {
  label: string;
  href: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Stores
  const book = useBooksStore((s) => s.books.find((b) => b.id === bookId));
  const booksHydrated = useBooksStore((s) => s._hydrated);
  const sessionsHydrated = useSessionsStore((s) => s._hydrated);
  const updateBook = useBooksStore((s) => s.updateBook);
  const changeStatus = useBooksStore((s) => s.changeStatus);
  const addSession = useSessionsStore((s) => s.addSession);
  const addQuote = useQuotesStore((s) => s.addQuote);
  const allQuotes = useQuotesStore((s) => s.quotes);
  const existingQuotes = useMemo(
    () => allQuotes.filter((q) => q.bookId === bookId && q.cfi),
    [allQuotes, bookId],
  );
  const readerSettings = useReaderSettingsStore((s) => s.settings);

  // WebView ref
  const webViewRef = useRef<any>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [quoteMode, setQuoteMode] = useState(false);
  const quoteModeRef = useRef(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, total: 0, percent: 0, chapter: "", location: 0 });

  // Highlight state
  const [selectedText, setSelectedText] = useState("");
  const [selectedCfi, setSelectedCfi] = useState("");
  const [highlightColor, setHighlightColor] = useState<QuoteColor>("yellow");
  const [highlightNote, setHighlightNote] = useState("");
  const [pendingQuote, setPendingQuote] = useState<{ text: string; cfi: string } | null>(null);

  // Session tracking
  const startedAtRef = useRef(new Date().toISOString());
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const [canLeave, setCanLeave] = useState(false);
  const pendingExitActionRef = useRef<NavigationAction | null>(null);
  const exitDispatchedRef = useRef(false);
  const sessionEndedAtRef = useRef<string | null>(null);
  const initialPercentRef = useRef<number | null>(null);
  const finalPercentRef = useRef(0);
  const netPagesRef = useRef(0);
  const sessionSavedRef = useRef(false);

  // WebView ready flag
  const webViewReadyRef = useRef(false);
  const pendingBase64Ref = useRef<string | null>(null);
  const pendingLocationsRef = useRef<string | null>(null);

  const readerHtml = useMemo(() => getBundledReaderHtml(), []);

  // Keep ref in sync with state
  useEffect(() => { quoteModeRef.current = quoteMode; }, [quoteMode]);

  // Keep screen awake on native
  useEffect(() => {
    if (Platform.OS === "web") return;
    activateKeepAwakeAsync("reader");
    return () => { deactivateKeepAwake("reader"); };
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => {
    startTimer();
    return pauseTimer;
  }, [startTimer, pauseTimer]);

  // Auto-set status to READING if TBR (run once on mount)
  useEffect(() => {
    if (booksHydrated && book && book.status === "TBR") {
      changeStatus(book.id, "READING");
    }
  }, [booksHydrated, book, changeStatus]);

  // Save session on leaving
  const saveSession = useCallback((note: string) => {
    if (sessionSavedRef.current || !bookId || !booksHydrated || !sessionsHydrated || !book) return false;
    sessionSavedRef.current = true;

    const durationMin = Math.max(1, Math.round(elapsedRef.current / 60));

    const pagesRead = Math.max(0, netPagesRef.current);

    addSession({
      bookId,
      startedAt: startedAtRef.current,
      endedAt: sessionEndedAtRef.current ?? new Date().toISOString(),
      durationMin,
      pagesRead,
      note: note.trim() || null,
    });

    // Update currentPage based on reading percentage
    if (book && finalPercentRef.current > 0) {
      const currentPage = Math.round(finalPercentRef.current * book.pageCount);
      updateBook(bookId, { currentPage });
    }
    return true;
  }, [bookId, book, booksHydrated, sessionsHydrated, addSession, updateBook]);

  const openSessionSummary = useCallback(() => {
    if (sessionEndedAtRef.current) return;
    sessionEndedAtRef.current = new Date().toISOString();
    pauseTimer();
    setShowSessionSummary(true);
  }, [pauseTimer]);

  const continueReading = useCallback(() => {
    pendingExitActionRef.current = null;
    sessionEndedAtRef.current = null;
    setShowSessionSummary(false);
    startTimer();
  }, [startTimer]);

  // Intercept the toolbar, Android back button, and navigation gestures alike.
  usePreventRemove(Boolean(book?.epubUri && booksHydrated && sessionsHydrated && !canLeave), ({ data }) => {
    pendingExitActionRef.current = data.action;
    openSessionSummary();
  });

  // Dispatch only after the removal guard has been lifted.
  useEffect(() => {
    if (!canLeave || exitDispatchedRef.current) return;
    exitDispatchedRef.current = true;
    if (pendingExitActionRef.current) {
      navigation.dispatch(pendingExitActionRef.current);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/book/${bookId}`);
    }
  }, [canLeave, navigation, router, bookId]);

  // Load ePub when the stored book has finished hydrating.
  useEffect(() => {
    if (!book?.epubUri) return;
    Promise.all([
      readEpubAsBase64(book.epubUri),
      useReaderSettingsStore.getState().getLocations(bookId!),
    ]).then(([base64, cachedLocations]) => {
      const cfi = useReaderSettingsStore.getState().getPosition(bookId!) ?? undefined;
      const msg = { type: "load", data: base64, cfi, cachedLocations: cachedLocations ?? undefined };
      if (webViewReadyRef.current) {
        sendToWebView(msg);
      } else {
        pendingBase64Ref.current = base64;
        pendingLocationsRef.current = cachedLocations;
      }
    }).catch((error) => {
      setReaderError(error instanceof Error ? error.message : "No se pudo abrir el ePub.");
      setLoading(false);
    });
  }, [book?.epubUri, bookId]);

  function sendToWebView(msg: Record<string, unknown>) {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(msg));
    }
  }

  function handleWebViewMessage(event: { nativeEvent?: { data: string }; data?: string }) {
    const raw = event.nativeEvent?.data ?? event.data;
    if (!raw || typeof raw !== "string") return;

    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "ready":
        webViewReadyRef.current = true;
        if (pendingBase64Ref.current) {
          const cfi = useReaderSettingsStore.getState().getPosition(bookId!) ?? undefined;
          sendToWebView({
            type: "load",
            data: pendingBase64Ref.current,
            cfi,
            cachedLocations: pendingLocationsRef.current ?? undefined,
          });
          pendingBase64Ref.current = null;
          pendingLocationsRef.current = null;
        }
        break;

      case "bookLoaded":
        setLoading(false);
        setToc(msg.toc ?? []);
        // Apply saved settings
        sendToWebView({ type: "setTheme", theme: readerSettings.theme });
        sendToWebView({ type: "setFontSize", size: readerSettings.fontSize });
        sendToWebView({ type: "setFontFamily", family: readerSettings.fontFamily });
        // Restore existing highlights
        for (const q of existingQuotes) {
          if (q.cfi) sendToWebView({ type: "highlight", cfi: q.cfi, color: q.color });
        }
        break;

      case "locationsReady":
        // Update book's pageCount with epub.js locations count (more accurate than spine items)
        if (msg.totalPages && bookId) {
          updateBook(bookId, { pageCount: msg.totalPages });
        }
        // Cache generated locations for instant load next time
        if (msg.locations && bookId) {
          useReaderSettingsStore.getState().saveLocations(bookId, msg.locations);
        }
        break;

      case "relocated":
        if (msg.rawPercent < 0) break; // locations not ready yet
        setPageInfo({
          page: msg.page ?? 0,
          total: msg.total ?? 0,
          percent: msg.percent ?? Math.round((msg.rawPercent ?? 0) * 100),
          chapter: msg.chapter ?? "",
          location: msg.location ?? 0,
        });
        // Use raw percent (0-1) for progress tracking
        if (initialPercentRef.current === null) {
          initialPercentRef.current = msg.rawPercent ?? 0;
        }
        finalPercentRef.current = msg.rawPercent ?? 0;
        if (bookId && msg.cfi) {
          useReaderSettingsStore.getState().savePosition(bookId, msg.cfi);
        }
        break;

      case "selected":
        if (!quoteModeRef.current) break;
        setPendingQuote({ text: msg.text ?? "", cfi: msg.cfi ?? "" });
        Haptics.selectionAsync();
        break;

      case "nav":
        if (msg.direction === "next") netPagesRef.current += 1;
        else if (msg.direction === "prev") netPagesRef.current -= 1;
        break;

      case "tap":
        if (!quoteModeRef.current) setToolbarVisible((v) => !v);
        break;

      case "error":
        setReaderError(msg.message || "No se pudo abrir el ePub.");
        setLoading(false);
        break;
    }
  }

  function handleSaveHighlight() {
    if (!selectedText || !bookId) return;
    addQuote(bookId, selectedText, null, highlightNote || null, highlightColor, selectedCfi);
    sendToWebView({ type: "highlight", cfi: selectedCfi, color: highlightColor });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowHighlight(false);
    setQuoteMode(false);
  }

  function handleConfirmQuote() {
    if (!pendingQuote) return;
    setSelectedText(pendingQuote.text);
    setSelectedCfi(pendingQuote.cfi);
    setHighlightColor("yellow");
    setHighlightNote("");
    setPendingQuote(null);
    setQuoteMode(false);
    setShowHighlight(true);
  }

  function handleCancelHighlight() {
    setShowHighlight(false);
    setQuoteMode(false);
    setPendingQuote(null);
  }

  function handleBack() {
    if (book?.epubUri && booksHydrated && sessionsHydrated) {
      openSessionSummary();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/book/${bookId}`);
    }
  }

  function handleSaveSession() {
    if (saveSession(sessionNote)) {
      setShowSessionSummary(false);
      setCanLeave(true);
    }
  }

  if (!book || !book.epubUri) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Este libro no tiene ePub asociado</Text>
        <Pressable onPress={handleBack} style={{ marginTop: 16, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isWeb = Platform.OS === "web";

  const themeBg = readerSettings.theme === "dark" ? "#1a1a1a" : readerSettings.theme === "sepia" ? "#f4ecd8" : "#ffffff";
  const themeFg = readerSettings.theme === "dark" ? "#e0e0e0" : readerSettings.theme === "sepia" ? "#5b4636" : "#1a1a1a";

  return (
    <View style={{ flex: 1, backgroundColor: themeBg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top toolbar — always takes space, content hidden via opacity */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: themeBg,
          borderBottomWidth: 1,
          borderBottomColor: readerSettings.theme === "dark" ? "#333" : "#e0e0e0",
          opacity: toolbarVisible ? 1 : 0,
        }}
        pointerEvents={toolbarVisible ? "auto" : "none"}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          style={{ width: 36, height: 36, justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: "600", color: themeFg, marginHorizontal: 8 }}
          numberOfLines={1}
        >
          {book.title}
        </Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable onPress={() => { setQuoteMode(true); setToolbarVisible(false); }} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </Pressable>
          <Pressable onPress={() => setShowToc(true)} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>📑</Text>
          </Pressable>
          <Pressable onPress={() => setShowSettings(true)} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      {/* Reader view */}
      <View style={{ flex: 1 }}>
        {loading && !readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        {readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: themeBg }}>
            <Text style={{ color: themeFg, textAlign: "center" }}>{readerError}</Text>
          </View>
        )}
        {isWeb ? (
          <WebIframe
            ref={webViewRef}
            html={readerHtml}
            onMessage={handleWebViewMessage}
            style={{ flex: 1, backgroundColor: themeBg }}
          />
        ) : (
          <NativeWebView
            ref={webViewRef}
            html={readerHtml}
            onMessage={handleWebViewMessage}
            style={{ flex: 1, backgroundColor: themeBg }}
          />
        )}
        {/* Navigation overlays — disabled in quote mode so user can select text */}
        {!loading && !isWeb && !quoteMode && (
          <>
            <View
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%" }}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={() => { netPagesRef.current -= 1; sendToWebView({ type: "prev" }); }}
                style={{ flex: 1 }}
                android_disableSound
              />
            </View>
            <View
              style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "30%" }}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={() => { netPagesRef.current += 1; sendToWebView({ type: "next" }); }}
                style={{ flex: 1 }}
                android_disableSound
              />
            </View>
          </>
        )}
      </View>

      {/* Quote mode hint — top, absolutely positioned */}
      {quoteMode && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 12,
            paddingBottom: 8,
            paddingHorizontal: 16,
            backgroundColor: "#FBBF24",
            zIndex: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#666" }}>
            Mantené presionado para seleccionar texto
          </Text>
        </View>
      )}

      {/* Quote mode buttons — bottom, absolutely positioned */}
      {quoteMode && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingVertical: 10,
            paddingHorizontal: 16,
            backgroundColor: "#FBBF24",
            paddingBottom: 30,
            zIndex: 20,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Pressable
            onPress={handleConfirmQuote}
            disabled={!pendingQuote}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: pendingQuote ? "#34C759" : "#ccc",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Guardar cita</Text>
          </Pressable>
          <Pressable
            onPress={() => { setQuoteMode(false); setPendingQuote(null); }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.1)",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FF3B30" }}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom toolbar — always takes space, content hidden via opacity */}
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: themeBg,
          borderTopWidth: 1,
          borderTopColor: readerSettings.theme === "dark" ? "#333" : "#e0e0e0",
          paddingBottom: 20,
          opacity: toolbarVisible && !quoteMode ? 1 : 0,
        }}
        pointerEvents={toolbarVisible && !quoteMode ? "auto" : "none"}
      >
        <Text style={{ fontSize: 13, color: themeFg }}>
          {pageInfo.chapter ? `${pageInfo.chapter} · ` : ""}
          {pageInfo.percent}%
        </Text>
        <Text style={{ fontSize: 13, color: "#888" }}>
          {formatTime(elapsed)}
        </Text>
      </View>

      {/* Closing an ePub reader completes the same reading session as the manual flow. */}
      <Modal
        visible={showSessionSummary}
        transparent
        animationType="slide"
        onRequestClose={continueReading}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <View
            style={{
              backgroundColor: themeBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "600", color: themeFg, marginBottom: 4 }}>
              Sesión finalizada
            </Text>
            <Text style={{ fontSize: 15, color: "#888", marginBottom: 20 }}>
              Duración: {formatTime(elapsed)} · Progreso: {pageInfo.percent}%
            </Text>

            <Text style={{ fontSize: 14, fontWeight: "600", color: themeFg, marginBottom: 6 }}>
              Nota (opcional)
            </Text>
            <TextInput
              value={sessionNote}
              onChangeText={setSessionNote}
              placeholder="¿Qué te pareció lo que leíste?"
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: readerSettings.theme === "dark" ? "#555" : "#ddd",
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                color: themeFg,
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleSaveSession}
              style={{ backgroundColor: "#34C759", paddingVertical: 14, borderRadius: 10, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Guardar sesión</Text>
            </Pressable>
            <Pressable onPress={continueReading} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ color: "#007AFF", fontSize: 15 }}>Seguir leyendo</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowSettings(false)}
        />
        <View
          style={{
            backgroundColor: themeBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "bold", marginBottom: 20, color: themeFg }}>
            Ajustes de lectura
          </Text>

          {/* Font size */}
          <Text style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Tamaño de fuente</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <Pressable
              onPress={() => {
                const size = Math.max(60, readerSettings.fontSize - 10);
                useReaderSettingsStore.getState().updateSettings({ fontSize: size });
                sendToWebView({ type: "setFontSize", size });
              }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>A-</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "600", color: themeFg }}>{readerSettings.fontSize}%</Text>
            <Pressable
              onPress={() => {
                const size = Math.min(200, readerSettings.fontSize + 10);
                useReaderSettingsStore.getState().updateSettings({ fontSize: size });
                sendToWebView({ type: "setFontSize", size });
              }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>A+</Text>
            </Pressable>
          </View>

          {/* Theme */}
          <Text style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Tema</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.theme}
                onPress={() => {
                  useReaderSettingsStore.getState().updateSettings({ theme: opt.theme });
                  sendToWebView({ type: "setTheme", theme: opt.theme });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: opt.bg,
                  borderWidth: 2,
                  borderColor: readerSettings.theme === opt.theme ? "#007AFF" : "#ddd",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: opt.fg, fontSize: 13, fontWeight: "600" }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Font family */}
          <Text style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Tipografía</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FONT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  useReaderSettingsStore.getState().updateSettings({ fontFamily: opt.value });
                  sendToWebView({ type: "setFontFamily", family: opt.value });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: readerSettings.fontFamily === opt.value ? "#007AFF" : "#ddd",
                  backgroundColor: readerSettings.fontFamily === opt.value ? "#007AFF" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: readerSettings.fontFamily === opt.value ? "#fff" : themeFg,
                    fontWeight: readerSettings.fontFamily === opt.value ? "600" : "400",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* TOC modal */}
      <Modal visible={showToc} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowToc(false)}
        />
        <View
          style={{
            backgroundColor: themeBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 40,
            maxHeight: "60%",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "bold", marginBottom: 16, color: themeFg }}>
            Tabla de contenidos
          </Text>
          <ScrollView>
            {toc.length === 0 ? (
              <Text style={{ color: "#888", fontSize: 14 }}>No hay tabla de contenidos disponible.</Text>
            ) : (
              toc.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    sendToWebView({ type: "goto", cfi: item.href });
                    setShowToc(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: readerSettings.theme === "dark" ? "#333" : "#eee",
                  }}
                >
                  <Text style={{ fontSize: 15, color: themeFg }}>{item.label}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Highlight modal */}
      <Modal visible={showHighlight} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={handleCancelHighlight}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "bold", marginBottom: 12 }}>
              Guardar cita
            </Text>

            {/* Selected text preview */}
            <View
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: COLOR_OPTIONS.find((c) => c.color === highlightColor)?.hex ?? "#FBBF24",
              }}
            >
              <Text style={{ fontSize: 14, fontStyle: "italic", lineHeight: 20 }} numberOfLines={5}>
                &ldquo;{selectedText}&rdquo;
              </Text>
            </View>

            {/* Color picker */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {COLOR_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.color}
                  onPress={() => setHighlightColor(opt.color)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: opt.hex,
                    borderWidth: 3,
                    borderColor: highlightColor === opt.color ? "#333" : "transparent",
                  }}
                />
              ))}
            </View>

            {/* Note input */}
            <TextInput
              value={highlightNote}
              onChangeText={setHighlightNote}
              placeholder="Nota (opcional)"
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                minHeight: 60,
                marginBottom: 16,
              }}
            />

            {/* Save button */}
            <Pressable
              onPress={handleSaveHighlight}
              style={{
                backgroundColor: "#34C759",
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Guardar cita
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// --- Platform-specific reader views ---

interface ReaderViewProps {
  html: string;
  onMessage: (event: any) => void;
  style?: any;
}

const NativeWebView = forwardRef<any, ReaderViewProps>(
  function NativeWebView({ html, onMessage, style }, ref) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebView = require("react-native-webview").default;
    return (
      <WebView
        ref={ref}
        source={{ html }}
        style={style}
        onMessage={onMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    );
  },
);

const WebIframe = forwardRef<any, ReaderViewProps>(
  function WebIframe({ html, onMessage, style }, ref) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useImperativeHandle(ref, () => ({
    postMessage: (json: string) => {
      iframeRef.current?.contentWindow?.postMessage(json, "*");
    },
  }));

  useEffect(() => {
    function handler(event: MessageEvent) {
      if (event.source === iframeRef.current?.contentWindow) {
        onMessageRef.current({ data: event.data });
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // When iframe loads, ask it to re-send ready (in case we missed it)
  const handleLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type: "ping" }), "*");
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      onLoad={handleLoad}
      style={{
        ...(typeof style === "object" ? style : {}),
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
  },
);
