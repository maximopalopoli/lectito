import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { usePreventRemove, type NavigationAction } from "expo-router/react-navigation";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { randomUUID } from "expo-crypto";

import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";
import { useQuotesStore } from "@/store/quotes";
import { useReaderSettingsStore } from "@/store/readerSettings";
import { confirmThen } from "@/lib/confirm";
import { recordSession } from "@/lib/recordSession";
import { EpubUnavailableError, persistEpub, readEpubAsBase64 } from "@/lib/epubStorage";
import { pickDocument } from "@/lib/pickDocument";
import { getBundledReaderHtml } from "@/lib/readerAssets";
import { estimatePages, updatePageSample, type PageSample } from "@/lib/readerPages";
import { darkColors, lightColors } from "@/lib/theme";
import type { QuoteColor, ReaderThemeName } from "@/types";

const COLOR_OPTIONS: { color: QuoteColor; hex: string }[] = [
  { color: "yellow", hex: "#FBBF24" },
  { color: "blue", hex: "#60A5FA" },
  { color: "green", hex: "#34D399" },
  { color: "pink", hex: "#F472B6" },
  { color: "purple", hex: "#A78BFA" },
];

const COLOR_LABELS: Record<QuoteColor, string> = {
  yellow: "Amarillo",
  blue: "Azul",
  green: "Verde",
  pink: "Rosa",
  purple: "Violeta",
};

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

function ToolbarButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

function SummaryStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{label}</Text>
    </View>
  );
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
  const [epubMissing, setEpubMissing] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showQuoteHint, setShowQuoteHint] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  // page/total: páginas de pantalla del libro con la letra actual (0 mientras no se pueden estimar).
  const [pageInfo, setPageInfo] = useState({ page: 0, total: 0, percent: 0, chapter: "", location: 0 });
  const totalLocationsRef = useRef(0);
  const pageSampleRef = useRef<PageSample | null>(null);

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
  const [summaryPages, setSummaryPages] = useState(0);
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

  // La pista de "cómo guardar una cita" se oculta sola.
  useEffect(() => {
    if (!showQuoteHint) return;
    const timeout = setTimeout(() => setShowQuoteHint(false), 4000);
    return () => clearTimeout(timeout);
  }, [showQuoteHint]);

  // Otra letra o tipografía cambia cuánto texto entra por página: se vuelve a medir.
  useEffect(() => {
    pageSampleRef.current = null;
  }, [readerSettings.fontSize, readerSettings.fontFamily]);

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

  // Save session on leaving
  const saveSession = useCallback((note: string) => {
    if (sessionSavedRef.current || !bookId || !booksHydrated || !sessionsHydrated || !book) return false;
    sessionSavedRef.current = true;

    const durationMin = Math.max(1, Math.round(elapsedRef.current / 60));

    const pagesRead = Math.max(0, netPagesRef.current);

    // Recién al guardar una sesión el libro pasa a "Leyendo" (abrirlo para mirar no cuenta).
    // currentPage se deriva del porcentaje leído.
    return recordSession(
      {
        bookId,
        startedAt: startedAtRef.current,
        endedAt: sessionEndedAtRef.current ?? new Date().toISOString(),
        durationMin,
        pagesRead,
        note: note.trim() || null,
      },
      {
        currentPage: finalPercentRef.current > 0 ? Math.round(finalPercentRef.current * book.pageCount) : undefined,
        status: book.status === "TBR" ? "READING" : undefined,
      },
    );
  }, [bookId, book, booksHydrated, sessionsHydrated]);

  const openSessionSummary = useCallback(() => {
    if (sessionEndedAtRef.current) return;
    sessionEndedAtRef.current = new Date().toISOString();
    pauseTimer();
    setSummaryPages(Math.max(0, netPagesRef.current));
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
    if (isShortVisit()) setCanLeave(true);
    else openSessionSummary();
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
      setEpubMissing(error instanceof EpubUnavailableError);
      setLoading(false);
    });
  }, [book?.epubUri, bookId]);

  // Sessions, position, and highlights belong to the book, so a new copy of the file picks them up.
  const handleReattachEpub = useCallback(async () => {
    try {
      const pickedUri = await pickDocument("application/epub+zip");
      if (!pickedUri) return;
      const epubUri = await persistEpub(pickedUri, randomUUID());
      setReaderError(null);
      setEpubMissing(false);
      setLoading(true);
      useBooksStore.getState().updateBook(bookId!, { epubUri });
    } catch {
      setReaderError("No se pudo guardar el ePub elegido. Probá de nuevo.");
    }
  }, [bookId]);

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
        if (msg.totalPages) totalLocationsRef.current = msg.totalPages;
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
        pageSampleRef.current = updatePageSample(pageSampleRef.current, msg.chapterChars ?? 0, msg.total ?? 0);
        const pages = estimatePages(msg.rawPercent ?? 0, totalLocationsRef.current, pageSampleRef.current);
        setPageInfo({
          page: pages?.page ?? 0,
          total: pages?.total ?? 0,
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
          useReaderSettingsStore.getState().savePosition(bookId, msg.cfi, {
            percent: msg.rawPercent ?? 0,
            chapter: (msg.chapter ?? "").trim(),
          });
        }
        break;

      case "selected":
        setPendingQuote({ text: msg.text ?? "", cfi: msg.cfi ?? "" });
        setShowQuoteHint(false);
        Haptics.selectionAsync();
        break;

      case "selectionCleared":
        setPendingQuote(null);
        break;

      case "nav":
        if (msg.direction === "next") netPagesRef.current += 1;
        else if (msg.direction === "prev") netPagesRef.current -= 1;
        break;

      case "tap":
        setToolbarVisible((v) => !v);
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
    sendToWebView({ type: "clearSelection" });
  }

  function handleConfirmQuote() {
    if (!pendingQuote) return;
    setSelectedText(pendingQuote.text);
    setSelectedCfi(pendingQuote.cfi);
    setHighlightColor("yellow");
    setHighlightNote("");
    setPendingQuote(null);
    setShowHighlight(true);
  }

  function handleCancelHighlight() {
    setShowHighlight(false);
    sendToWebView({ type: "clearSelection" });
  }

  /** Menos de un minuto sin pasar páginas: se abrió para mirar, no hay sesión que registrar. */
  function isShortVisit() {
    return elapsedRef.current < 60 && netPagesRef.current === 0;
  }

  function handleBack() {
    if (book?.epubUri && booksHydrated && sessionsHydrated) {
      if (isShortVisit()) setCanLeave(true);
      else openSessionSummary();
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

  function handleDiscardSession() {
    confirmThen(
      "¿Salir sin guardar?",
      `No se va a registrar esta sesión de ${formatTime(elapsedRef.current)}.`,
      "Salir",
      () => {
        sessionSavedRef.current = true;
        setShowSessionSummary(false);
        setCanLeave(true);
      },
    );
  }

  if (!book || !book.epubUri) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888", fontSize: 16 }}>Este libro no tiene ePub asociado</Text>
        <Pressable accessibilityRole="button" onPress={handleBack} style={{ marginTop: 16, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: "#007AFF", fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isWeb = Platform.OS === "web";

  const themeBg = readerSettings.theme === "dark" ? "#1a1a1a" : readerSettings.theme === "sepia" ? "#f4ecd8" : "#ffffff";
  const themeFg = readerSettings.theme === "dark" ? "#e0e0e0" : readerSettings.theme === "sepia" ? "#5b4636" : "#1a1a1a";
  // Acentos de la app según el tema del lector (no el del sistema), para que contrasten con el fondo.
  const ui = readerSettings.theme === "dark" ? darkColors : lightColors;
  const currentChapter = pageInfo.chapter.trim();
  const panelBg = readerSettings.theme === "dark" ? "#262626" : readerSettings.theme === "sepia" ? "#ebe1c9" : "#f5f5f5";
  const dividerColor = readerSettings.theme === "dark" ? "#444" : readerSettings.theme === "sepia" ? "#d8ccb0" : "#ddd";

  return (
    <View style={{ flex: 1, backgroundColor: themeBg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top toolbar — always takes space, content hidden via opacity */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingBottom: 4,
          paddingHorizontal: 8,
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
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={24} color={ui.primary} />
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: "600", color: themeFg, marginHorizontal: 8 }}
          numberOfLines={1}
        >
          {book.title}
        </Text>
        <View style={{ flexDirection: "row" }}>
          <ToolbarButton
            icon="bookmark-outline"
            label="Cómo guardar una cita"
            color={ui.primary}
            onPress={() => setShowQuoteHint(true)}
          />
          <ToolbarButton icon="list-outline" label="Tabla de contenidos" color={ui.primary} onPress={() => setShowToc(true)} />
          <ToolbarButton icon="text-outline" label="Ajustes de lectura" color={ui.primary} onPress={() => setShowSettings(true)} />
        </View>
      </View>

      {/* Reader view */}
      <View style={{ flex: 1 }}>
        {loading && !readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={ui.primary} />
          </View>
        )}
        {readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: themeBg }}>
            <Text style={{ color: themeFg, textAlign: "center" }}>{readerError}</Text>
            {epubMissing && (
              <Pressable
                onPress={handleReattachEpub}
                accessibilityRole="button"
                style={{ marginTop: 20, minHeight: 44, paddingHorizontal: 20, borderRadius: 22, justifyContent: "center", backgroundColor: ui.primary }}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Volver a adjuntar el ePub</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={handleBack} style={{ marginTop: 12, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: ui.primary, fontSize: 16 }}>Volver</Text>
            </Pressable>
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
      </View>

      {/* Selección de texto → guardar como cita */}
      {pendingQuote && !showHighlight && (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 64, alignItems: "center", zIndex: 20 }}
        >
          <Pressable
            onPress={handleConfirmQuote}
            accessibilityRole="button"
            accessibilityLabel="Guardar la selección como cita"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              paddingHorizontal: 18,
              borderRadius: 22,
              backgroundColor: ui.primary,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          >
            <Ionicons name="bookmark-outline" size={18} color={ui.onPrimary} />
            <Text style={{ color: ui.onPrimary, fontSize: 15, fontWeight: "600" }}>Guardar cita</Text>
          </Pressable>
        </View>
      )}

      {/* Pista: cómo se guarda una cita */}
      {showQuoteHint && !pendingQuote && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 64, alignItems: "center", zIndex: 20 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: readerSettings.theme === "dark" ? "#333" : "#1a1a1a",
            }}
          >
            <Ionicons name="finger-print-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, flexShrink: 1 }}>
              {isWeb ? "Seleccioná un texto" : "Mantené presionado un texto"} para guardarlo como cita
            </Text>
          </View>
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
          opacity: toolbarVisible ? 1 : 0,
        }}
        pointerEvents={toolbarVisible ? "auto" : "none"}
      >
        <Text style={{ fontSize: 13, color: themeFg }}>
          {pageInfo.chapter ? `${pageInfo.chapter} · ` : ""}
          {pageInfo.total > 0 ? `Pág. ${pageInfo.page} de ${pageInfo.total} · ` : ""}
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
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold", color: themeFg, marginBottom: 16 }}>
              ¡Buena sesión!
            </Text>

            <View
              style={{
                flexDirection: "row",
                borderRadius: 12,
                paddingVertical: 14,
                marginBottom: 20,
                backgroundColor: readerSettings.theme === "dark" ? "#262626" : "rgba(0,0,0,0.04)",
              }}
            >
              <SummaryStat value={formatTime(elapsed)} label="tiempo" color={themeFg} />
              <SummaryStat value={String(summaryPages)} label={summaryPages === 1 ? "página" : "páginas"} color={themeFg} />
              <SummaryStat value={`${pageInfo.percent}%`} label="del libro" color={themeFg} />
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", color: themeFg, marginBottom: 6 }}>
              Nota (opcional)
            </Text>
            <TextInput
              value={sessionNote}
              onChangeText={setSessionNote}
              accessibilityLabel="Nota de la sesión"
              placeholder="¿Qué te pareció lo que leíste?"
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: readerSettings.theme === "dark" ? "#555" : "#ddd",
                borderRadius: 10,
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
              accessibilityRole="button"
              style={{ backgroundColor: ui.primary, minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: ui.onPrimary, fontWeight: "600", fontSize: 16 }}>Guardar sesión</Text>
            </Pressable>
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              <Pressable
                onPress={continueReading}
                accessibilityRole="button"
                style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48 }}
              >
                <Text style={{ color: ui.primary, fontSize: 15, fontWeight: "600" }}>Seguir leyendo</Text>
              </Pressable>
              <Pressable
                onPress={handleDiscardSession}
                accessibilityRole="button"
                style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48 }}
              >
                <Text style={{ color: ui.danger, fontSize: 15, fontWeight: "600" }}>Salir sin guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowSettings(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar ajustes de lectura"
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
              accessibilityRole="button"
              accessibilityLabel="Achicar texto"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" }}
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
              accessibilityRole="button"
              accessibilityLabel="Agrandar texto"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" }}
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
                accessibilityRole="radio"
                accessibilityLabel={`Tema ${opt.label}`}
                accessibilityState={{ selected: readerSettings.theme === opt.theme }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  justifyContent: "center",
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: opt.bg,
                  borderWidth: 2,
                  borderColor: readerSettings.theme === opt.theme ? ui.primary : "#ddd",
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
                accessibilityRole="radio"
                accessibilityState={{ selected: readerSettings.fontFamily === opt.value }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  justifyContent: "center",
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: readerSettings.fontFamily === opt.value ? ui.primary : "#ddd",
                  backgroundColor: readerSettings.fontFamily === opt.value ? ui.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: readerSettings.fontFamily === opt.value ? ui.onPrimary : themeFg,
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
      <Modal visible={showToc} transparent animationType="slide" onRequestClose={() => setShowToc(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setShowToc(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar índice"
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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "bold", color: themeFg }}>
              Tabla de contenidos
            </Text>
            <Pressable
              onPress={() => setShowToc(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}
            >
              <Ionicons name="close" size={24} color={themeFg} />
            </Pressable>
          </View>
          <ScrollView>
            {toc.length === 0 ? (
              <Text style={{ color: "#888", fontSize: 14 }}>No hay tabla de contenidos disponible.</Text>
            ) : (
              toc.map((item, i) => {
                const isCurrent = currentChapter !== "" && item.label.trim() === currentChapter;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      sendToWebView({ type: "goto", cfi: item.href });
                      setShowToc(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isCurrent }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: 44,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: readerSettings.theme === "dark" ? "#333" : "#eee",
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: isCurrent ? ui.primary : themeFg,
                        fontWeight: isCurrent ? "600" : "400",
                      }}
                    >
                      {item.label}
                    </Text>
                    {isCurrent && <Ionicons name="bookmark" size={16} color={ui.primary} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Highlight modal */}
      <Modal visible={showHighlight} transparent animationType="fade" onRequestClose={handleCancelHighlight}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
            onPress={handleCancelHighlight}
            // Not focusable as a whole: the screen reader must reach the
            // note field and buttons inside the sheet one by one.
            accessible={false}
          >
            <Pressable
              onPress={() => {}}
              accessible={false}
              style={{
                backgroundColor: themeBg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ flex: 1, fontSize: 17, fontWeight: "bold", color: themeFg }}>Guardar cita</Text>
                <Pressable
                  onPress={handleCancelHighlight}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  hitSlop={8}
                  style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={24} color={themeFg} />
                </Pressable>
              </View>

              {/* Selected text preview */}
              <View
                style={{
                  backgroundColor: panelBg,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: COLOR_OPTIONS.find((c) => c.color === highlightColor)?.hex ?? "#FBBF24",
                }}
              >
                <Text style={{ fontSize: 14, fontStyle: "italic", lineHeight: 20, color: themeFg }} numberOfLines={5}>
                  &ldquo;{selectedText}&rdquo;
                </Text>
              </View>

              {/* Color picker */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {COLOR_OPTIONS.map((opt) => {
                  const selected = highlightColor === opt.color;
                  return (
                    <Pressable
                      key={opt.color}
                      onPress={() => setHighlightColor(opt.color)}
                      accessibilityRole="radio"
                      accessibilityLabel={COLOR_LABELS[opt.color]}
                      accessibilityState={{ selected }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        borderWidth: 2,
                        borderColor: selected ? themeFg : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: opt.hex }} />
                    </Pressable>
                  );
                })}
              </View>

              {/* Note input */}
              <TextInput
                value={highlightNote}
                onChangeText={setHighlightNote}
                accessibilityLabel="Nota de la cita, opcional"
                placeholder="Nota (opcional)"
                placeholderTextColor="#888"
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: dividerColor,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  minHeight: 60,
                  marginBottom: 16,
                  color: themeFg,
                  textAlignVertical: "top",
                }}
              />

              {/* Save button */}
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveHighlight}
                style={{
                  backgroundColor: ui.primary,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: ui.onPrimary, fontWeight: "600", fontSize: 16 }}>
                  Guardar cita
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  useLayoutEffect(() => {
    onMessageRef.current = onMessage;
  });

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
