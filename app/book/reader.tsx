import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
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
import { addPageSample, charsPerPage, estimatePages, type PageSamples } from "@/lib/readerPages";
import { darkColors, lightColors } from "@/lib/theme";
import type { QuoteColor, ReaderLineHeight, ReaderMargin, ReaderTheme, ReaderThemeName } from "@/types";

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

/** Colores del lector: siguen el tema elegido para leer, no el del sistema. */
interface ReaderPalette {
  bg: string;
  fg: string;
  /** Texto secundario; contraste de al menos 4.5:1 sobre `bg`. */
  muted: string;
  border: string;
  panel: string;
  accent: string;
  onAccent: string;
}

const PALETTES: Record<ReaderThemeName, ReaderPalette> = {
  light: { bg: "#ffffff", fg: "#1a1a1a", muted: "#6b6b6b", border: "rgba(0,0,0,0.1)", panel: "#f2f2f2", accent: lightColors.primary, onAccent: lightColors.onPrimary },
  dark: { bg: "#1a1a1a", fg: "#e0e0e0", muted: "#9a9a9a", border: "rgba(255,255,255,0.12)", panel: "#2a2a2a", accent: darkColors.primary, onAccent: darkColors.onPrimary },
  sepia: { bg: "#f4ecd8", fg: "#5b4636", muted: "#7a654d", border: "rgba(91,70,54,0.18)", panel: "#ebe1c9", accent: "#8b5a2b", onAccent: "#fff8ec" },
};

const THEME_OPTIONS: { label: string; theme: ReaderThemeName }[] = [
  { label: "Claro", theme: "light" },
  { label: "Oscuro", theme: "dark" },
  { label: "Sepia", theme: "sepia" },
];

const FONT_OPTIONS: { label: string; value: ReaderTheme["fontFamily"]; preview?: string }[] = [
  { label: "Original", value: "default" },
  { label: "Serif", value: "serif", preview: Platform.select({ ios: "Georgia", default: "serif" }) },
  { label: "Sans", value: "sans-serif", preview: Platform.select({ ios: "Helvetica", default: "sans-serif" }) },
  { label: "Mono", value: "monospace", preview: Platform.select({ ios: "Menlo", default: "monospace" }) },
];

/** `css: null` deja el interlineado que trae el libro. */
const LINE_HEIGHT_OPTIONS: { label: string; value: ReaderLineHeight; css: number | null }[] = [
  { label: "Compacto", value: "compact", css: 1.3 },
  { label: "Normal", value: "normal", css: null },
  { label: "Amplio", value: "relaxed", css: 1.8 },
];

const MARGIN_OPTIONS: { label: string; value: ReaderMargin; px: number }[] = [
  { label: "Normales", value: "normal", px: 0 },
  { label: "Amplios", value: "wide", px: 20 },
  { label: "Muy amplios", value: "wider", px: 40 },
];

function lineHeightCss(value: ReaderLineHeight | undefined) {
  return LINE_HEIGHT_OPTIONS.find((o) => o.value === (value ?? "normal"))?.css ?? null;
}

function marginPx(value: ReaderMargin | undefined) {
  return MARGIN_OPTIONS.find((o) => o.value === (value ?? "normal"))?.px ?? 0;
}

/** Alto de las franjas fijas con el capítulo (arriba) y la página (abajo). */
const RUNNING_HEAD_HEIGHT = 32;

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

function SummaryStat({ value, label, palette }: { value: string; label: string; palette: ReaderPalette }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", color: palette.fg }}>{value}</Text>
      <Text style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** Hoja inferior de los paneles del lector (ajustes, índice, citas). */
function ReaderSheet({
  visible,
  title,
  onClose,
  palette,
  bottomInset,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  palette: ReaderPalette;
  bottomInset: number;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`Cerrar ${title.toLowerCase()}`}
      />
      <View
        style={{
          backgroundColor: palette.bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottomInset + 24,
          maxHeight: "75%",
        }}
      >
        <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: 8 }} />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: "bold", color: palette.fg }}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}
          >
            <Ionicons name="close" size={24} color={palette.fg} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

function SettingLabel({ children, palette }: { children: string; palette: ReaderPalette }) {
  return <Text style={{ fontSize: 13, color: palette.muted, marginTop: 16, marginBottom: 8 }}>{children}</Text>;
}

/** Fila de opciones excluyentes; la elegida va con el color de acento. */
function OptionRow<T extends string>({
  options,
  value,
  onChange,
  palette,
  groupLabel,
}: {
  options: { label: string; value: T; preview?: string }[];
  value: T;
  onChange: (value: T) => void;
  palette: ReaderPalette;
  groupLabel: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={groupLabel}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 4,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected ? palette.accent : palette.border,
              backgroundColor: selected ? palette.accent : palette.panel,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: 13,
                fontFamily: opt.preview,
                color: selected ? palette.onAccent : palette.fg,
                fontWeight: selected ? "600" : "400",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
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
  const [showQuotes, setShowQuotes] = useState(false);
  // Las barras se superponen al texto: mostrarlas u ocultarlas no repagina el libro.
  const [chromeOpacity] = useState(() => new Animated.Value(1));
  const [toc, setToc] = useState<TocItem[]>([]);
  // page/total: páginas de pantalla del libro con la letra actual (0 mientras no se pueden estimar).
  const [pageInfo, setPageInfo] = useState({ page: 0, total: 0, percent: 0, chapter: "", location: 0 });
  const totalLocationsRef = useRef(0);
  const pageSamplesRef = useRef<PageSamples>({});

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

  useEffect(() => {
    Animated.timing(chromeOpacity, {
      toValue: toolbarVisible ? 1 : 0,
      duration: 160,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [toolbarVisible, chromeOpacity]);

  // Otra letra, tipografía, interlineado o margen cambia cuánto texto entra por página: se vuelve a medir.
  useEffect(() => {
    pageSamplesRef.current = {};
  }, [readerSettings.fontSize, readerSettings.fontFamily, readerSettings.lineHeight, readerSettings.margin]);

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
        sendToWebView({ type: "setLineHeight", value: lineHeightCss(readerSettings.lineHeight) });
        sendToWebView({ type: "setMargin", px: marginPx(readerSettings.margin) });
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
        if (typeof msg.sectionIndex === "number") {
          pageSamplesRef.current = addPageSample(pageSamplesRef.current, msg.sectionIndex, msg.chapterChars ?? 0, msg.total ?? 0);
        }
        const pages = estimatePages(msg.rawPercent ?? 0, totalLocationsRef.current, charsPerPage(pageSamplesRef.current));
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
        Haptics.selectionAsync();
        break;

      case "selectionCleared":
        setPendingQuote(null);
        break;

      case "nav":
        if (msg.direction === "next") netPagesRef.current += 1;
        else if (msg.direction === "prev") netPagesRef.current -= 1;
        break;

      case "layoutChanged":
        pageSamplesRef.current = {};
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

  function changeSettings(partial: Partial<ReaderTheme>) {
    useReaderSettingsStore.getState().updateSettings(partial);
    if (partial.theme) sendToWebView({ type: "setTheme", theme: partial.theme });
    if (partial.fontSize) sendToWebView({ type: "setFontSize", size: partial.fontSize });
    if (partial.fontFamily) sendToWebView({ type: "setFontFamily", family: partial.fontFamily });
    if (partial.lineHeight) sendToWebView({ type: "setLineHeight", value: lineHeightCss(partial.lineHeight) });
    if (partial.margin) sendToWebView({ type: "setMargin", px: marginPx(partial.margin) });
  }

  function goToQuote(cfi: string) {
    sendToWebView({ type: "goto", cfi });
    setShowQuotes(false);
    setToolbarVisible(false);
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
    const fallback = PALETTES[readerSettings.theme];
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: fallback.bg }}>
        <Text style={{ color: fallback.muted, fontSize: 16 }}>Este libro no tiene ePub asociado</Text>
        <Pressable accessibilityRole="button" onPress={handleBack} style={{ marginTop: 16, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: fallback.accent, fontSize: 16 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isWeb = Platform.OS === "web";
  const palette = PALETTES[readerSettings.theme];
  const ui = readerSettings.theme === "dark" ? darkColors : lightColors;
  const currentChapter = pageInfo.chapter.trim();
  const pageLabel = loading || readerError
    ? ""
    : pageInfo.total > 0
      ? `${pageInfo.page} de ${pageInfo.total}`
      : `${pageInfo.percent}%`;
  const chromeHidden = !toolbarVisible;
  const quotes = [...existingQuotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const quoteHint = `${isWeb ? "Seleccioná" : "Mantené presionado"} un texto para guardarlo como cita.`;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={readerSettings.theme === "dark" ? "light" : "dark"} />

      {/* Franja fija: capítulo actual */}
      <View style={{ paddingTop: insets.top, height: insets.top + RUNNING_HEAD_HEIGHT, justifyContent: "center", paddingHorizontal: 56 }}>
        <Text numberOfLines={1} style={{ textAlign: "center", fontSize: 12, color: palette.muted }}>
          {currentChapter || book.title}
        </Text>
      </View>

      {/* Reader view */}
      <View style={{ flex: 1 }}>
        {loading && !readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        )}
        {readerError && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: palette.bg }}>
            <Text style={{ color: palette.fg, textAlign: "center" }}>{readerError}</Text>
            {epubMissing && (
              <Pressable
                onPress={handleReattachEpub}
                accessibilityRole="button"
                style={{ marginTop: 20, minHeight: 44, paddingHorizontal: 20, borderRadius: 22, justifyContent: "center", backgroundColor: palette.accent }}
              >
                <Text style={{ color: palette.onAccent, fontSize: 16, fontWeight: "600" }}>Volver a adjuntar el ePub</Text>
              </Pressable>
            )}
            <Pressable accessibilityRole="button" onPress={handleBack} style={{ marginTop: 12, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: palette.accent, fontSize: 16 }}>Volver</Text>
            </Pressable>
          </View>
        )}
        {isWeb ? (
          <WebIframe
            ref={webViewRef}
            html={readerHtml}
            onMessage={handleWebViewMessage}
            style={{ flex: 1, backgroundColor: palette.bg }}
          />
        ) : (
          <NativeWebView
            ref={webViewRef}
            html={readerHtml}
            onMessage={handleWebViewMessage}
            style={{ flex: 1, backgroundColor: palette.bg }}
          />
        )}
      </View>

      {/* Franja fija: página */}
      <View style={{ height: insets.bottom + RUNNING_HEAD_HEIGHT, paddingBottom: insets.bottom, justifyContent: "center" }}>
        <Text style={{ textAlign: "center", fontSize: 12, color: palette.muted }}>{pageLabel}</Text>
      </View>

      {/* Barra superior: se superpone al texto */}
      <Animated.View
        pointerEvents={chromeHidden ? "none" : "auto"}
        accessibilityElementsHidden={chromeHidden}
        importantForAccessibility={chromeHidden ? "no-hide-descendants" : "auto"}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          opacity: chromeOpacity,
          paddingTop: insets.top + 4,
          paddingBottom: 4,
          paddingHorizontal: 8,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.bg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
          style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="chevron-back" size={24} color={palette.fg} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: palette.fg }}>
            {book.title}
          </Text>
          {currentChapter !== "" && (
            <Text numberOfLines={1} style={{ fontSize: 12, color: palette.muted, marginTop: 1 }}>
              {currentChapter}
            </Text>
          )}
        </View>
        <ToolbarButton icon="bookmarks-outline" label="Citas de este libro" color={palette.fg} onPress={() => setShowQuotes(true)} />
        <ToolbarButton icon="list-outline" label="Tabla de contenidos" color={palette.fg} onPress={() => setShowToc(true)} />
        <ToolbarButton icon="text-outline" label="Ajustes de lectura" color={palette.fg} onPress={() => setShowSettings(true)} />
      </Animated.View>

      {/* Barra inferior: progreso en el libro */}
      <Animated.View
        pointerEvents={chromeHidden ? "none" : "auto"}
        accessibilityElementsHidden={chromeHidden}
        importantForAccessibility={chromeHidden ? "no-hide-descendants" : "auto"}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          opacity: chromeOpacity,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: palette.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.border,
        }}
      >
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Avance en el libro"
          accessibilityValue={{ min: 0, max: 100, now: pageInfo.percent }}
          style={{ height: 3, borderRadius: 2, backgroundColor: palette.panel, overflow: "hidden" }}
        >
          <View style={{ width: `${pageInfo.percent}%`, height: "100%", backgroundColor: palette.accent }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: palette.fg }}>
            {pageInfo.total > 0 ? `Pág. ${pageInfo.page} de ${pageInfo.total}` : `${pageInfo.percent}% leído`}
          </Text>
          <Text style={{ fontSize: 13, color: palette.muted }}>
            {pageInfo.total > 0 ? `${pageInfo.percent}% · ` : ""}
            {formatTime(elapsed)}
          </Text>
        </View>
      </Animated.View>

      {/* Selección de texto → guardar como cita */}
      {pendingQuote && !showHighlight && (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 72, alignItems: "center", zIndex: 20 }}
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
              backgroundColor: palette.accent,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          >
            <Ionicons name="bookmark-outline" size={18} color={palette.onAccent} />
            <Text style={{ color: palette.onAccent, fontSize: 15, fontWeight: "600" }}>Guardar cita</Text>
          </Pressable>
        </View>
      )}

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
              backgroundColor: palette.bg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold", color: palette.fg, marginBottom: 16 }}>
              ¡Buena sesión!
            </Text>

            <View
              style={{
                flexDirection: "row",
                borderRadius: 12,
                paddingVertical: 14,
                marginBottom: 20,
                backgroundColor: palette.panel,
              }}
            >
              <SummaryStat value={formatTime(elapsed)} label="tiempo" palette={palette} />
              <SummaryStat value={String(summaryPages)} label={summaryPages === 1 ? "página" : "páginas"} palette={palette} />
              <SummaryStat value={`${pageInfo.percent}%`} label="del libro" palette={palette} />
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", color: palette.fg, marginBottom: 6 }}>
              Nota (opcional)
            </Text>
            <TextInput
              value={sessionNote}
              onChangeText={setSessionNote}
              accessibilityLabel="Nota de la sesión"
              placeholder="¿Qué te pareció lo que leíste?"
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: palette.fg,
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleSaveSession}
              accessibilityRole="button"
              style={{ backgroundColor: palette.accent, minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: palette.onAccent, fontWeight: "600", fontSize: 16 }}>Guardar sesión</Text>
            </Pressable>
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              <Pressable
                onPress={continueReading}
                accessibilityRole="button"
                style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48 }}
              >
                <Text style={{ color: palette.accent, fontSize: 15, fontWeight: "600" }}>Seguir leyendo</Text>
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

      <ReaderSheet
        visible={showSettings}
        title="Ajustes de lectura"
        onClose={() => setShowSettings(false)}
        palette={palette}
        bottomInset={insets.bottom}
      >
        <ScrollView>
          <SettingLabel palette={palette}>Tamaño de letra</SettingLabel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => changeSettings({ fontSize: Math.max(60, readerSettings.fontSize - 10) })}
              disabled={readerSettings.fontSize <= 60}
              accessibilityRole="button"
              accessibilityLabel="Achicar texto"
              accessibilityState={{ disabled: readerSettings.fontSize <= 60 }}
              style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.panel, justifyContent: "center", alignItems: "center", opacity: readerSettings.fontSize <= 60 ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: palette.fg }}>A</Text>
            </Pressable>
            <Text style={{ minWidth: 52, textAlign: "center", fontSize: 15, fontWeight: "600", color: palette.fg }}>
              {readerSettings.fontSize}%
            </Text>
            <Pressable
              onPress={() => changeSettings({ fontSize: Math.min(200, readerSettings.fontSize + 10) })}
              disabled={readerSettings.fontSize >= 200}
              accessibilityRole="button"
              accessibilityLabel="Agrandar texto"
              accessibilityState={{ disabled: readerSettings.fontSize >= 200 }}
              style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.panel, justifyContent: "center", alignItems: "center", opacity: readerSettings.fontSize >= 200 ? 0.4 : 1 }}
            >
              <Text style={{ fontSize: 20, fontWeight: "600", color: palette.fg }}>A</Text>
            </Pressable>
          </View>

          <SettingLabel palette={palette}>Tema</SettingLabel>
          <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tema">
            {THEME_OPTIONS.map((opt) => {
              const selected = readerSettings.theme === opt.theme;
              const swatch = PALETTES[opt.theme];
              return (
                <Pressable
                  key={opt.theme}
                  onPress={() => changeSettings({ theme: opt.theme })}
                  accessibilityRole="radio"
                  accessibilityLabel={`Tema ${opt.label}`}
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 10,
                    backgroundColor: swatch.bg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? palette.accent : palette.border,
                  }}
                >
                  <Text style={{ color: swatch.fg, fontSize: 13, fontWeight: "600" }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <SettingLabel palette={palette}>Tipografía</SettingLabel>
          <OptionRow
            options={FONT_OPTIONS}
            value={readerSettings.fontFamily}
            onChange={(fontFamily) => changeSettings({ fontFamily })}
            palette={palette}
            groupLabel="Tipografía"
          />

          <SettingLabel palette={palette}>Interlineado</SettingLabel>
          <OptionRow
            options={LINE_HEIGHT_OPTIONS}
            value={readerSettings.lineHeight ?? "normal"}
            onChange={(lineHeight) => changeSettings({ lineHeight })}
            palette={palette}
            groupLabel="Interlineado"
          />

          <SettingLabel palette={palette}>Márgenes</SettingLabel>
          <OptionRow
            options={MARGIN_OPTIONS}
            value={readerSettings.margin ?? "normal"}
            onChange={(margin) => changeSettings({ margin })}
            palette={palette}
            groupLabel="Márgenes"
          />
        </ScrollView>
      </ReaderSheet>

      <ReaderSheet
        visible={showToc}
        title="Tabla de contenidos"
        onClose={() => setShowToc(false)}
        palette={palette}
        bottomInset={insets.bottom}
      >
        <ScrollView>
          {toc.length === 0 ? (
            <Text style={{ color: palette.muted, fontSize: 14 }}>No hay tabla de contenidos disponible.</Text>
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
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.border,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: isCurrent ? palette.accent : palette.fg,
                      fontWeight: isCurrent ? "600" : "400",
                    }}
                  >
                    {item.label}
                  </Text>
                  {isCurrent && <Ionicons name="bookmark" size={16} color={palette.accent} />}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </ReaderSheet>

      <ReaderSheet
        visible={showQuotes}
        title="Citas de este libro"
        onClose={() => setShowQuotes(false)}
        palette={palette}
        bottomInset={insets.bottom}
      >
        {quotes.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
            <Ionicons name="bookmarks-outline" size={32} color={palette.muted} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: palette.fg }}>Todavía no guardaste citas</Text>
            <Text style={{ fontSize: 14, color: palette.muted, textAlign: "center" }}>{quoteHint}</Text>
          </View>
        ) : (
          <ScrollView>
            <Text style={{ fontSize: 13, color: palette.muted, marginBottom: 4 }}>{quoteHint}</Text>
            {quotes.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => goToQuote(q.cfi!)}
                accessibilityRole="button"
                accessibilityHint="Abre el libro en esta cita"
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: palette.border,
                }}
              >
                <View
                  style={{
                    width: 4,
                    borderRadius: 2,
                    backgroundColor: COLOR_OPTIONS.find((c) => c.color === q.color)?.hex ?? "#FBBF24",
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 21, color: palette.fg }}>
                    &ldquo;{q.text}&rdquo;
                  </Text>
                  {q.note ? (
                    <Text numberOfLines={2} style={{ fontSize: 13, color: palette.muted, marginTop: 4 }}>
                      {q.note}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ReaderSheet>

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
                backgroundColor: palette.bg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ flex: 1, fontSize: 17, fontWeight: "bold", color: palette.fg }}>Guardar cita</Text>
                <Pressable
                  onPress={handleCancelHighlight}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  hitSlop={8}
                  style={{ width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" }}
                >
                  <Ionicons name="close" size={24} color={palette.fg} />
                </Pressable>
              </View>

              {/* Selected text preview */}
              <View
                style={{
                  backgroundColor: palette.panel,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: COLOR_OPTIONS.find((c) => c.color === highlightColor)?.hex ?? "#FBBF24",
                }}
              >
                <Text style={{ fontSize: 14, fontStyle: "italic", lineHeight: 20, color: palette.fg }} numberOfLines={5}>
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
                        borderColor: selected ? palette.fg : "transparent",
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
                placeholderTextColor={palette.muted}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 14,
                  minHeight: 60,
                  marginBottom: 16,
                  color: palette.fg,
                  textAlignVertical: "top",
                }}
              />

              {/* Save button */}
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveHighlight}
                style={{
                  backgroundColor: palette.accent,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: palette.onAccent, fontWeight: "600", fontSize: 16 }}>
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
