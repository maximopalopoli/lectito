import { useEffect } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Text, useColorScheme, View } from "react-native";
import { useBooksStore } from "@/store/books";
import { useSessionsStore } from "@/store/sessions";
import { useQuotesStore } from "@/store/quotes";
import { useGoalsStore } from "@/store/goals";
import { useReaderSettingsStore } from "@/store/readerSettings";
import { useRecommendationsStore } from "@/store/recommendations";
import { useListsStore } from "@/store/lists";
import { useProfileStore } from "@/store/profile";
import { useStorageHealthStore } from "@/lib/storageHealth";
import { repairEpubCovers } from "@/lib/repairEpubCovers";
import Toast from "@/components/Toast";

export default function RootLayout() {
  const scheme = useColorScheme();
  const booksReady = useBooksStore((s) => s._hydrated);
  const sessionsReady = useSessionsStore((s) => s._hydrated);
  const quotesReady = useQuotesStore((s) => s._hydrated);
  const goalsReady = useGoalsStore((s) => s._hydrated);
  const readerReady = useReaderSettingsStore((s) => s._hydrated);
  const recommendationsReady = useRecommendationsStore((s) => s._hydrated);
  const listsReady = useListsStore((s) => s._hydrated);
  const profileReady = useProfileStore((s) => s._hydrated);
  const readError = useStorageHealthStore((s) => s.readError);
  const writeError = useStorageHealthStore((s) => s.writeError);
  const backgroundColor = scheme === "dark" ? "#111111" : "#ffffff";
  const color = scheme === "dark" ? "#ffffff" : "#111111";
  const hydrated = booksReady && sessionsReady && quotesReady && goalsReady && readerReady && recommendationsReady && listsReady && profileReady;

  useEffect(() => {
    if (booksReady) void repairEpubCovers();
  }, [booksReady]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        {writeError && (
          <View style={{ backgroundColor: "#9b1c1c", padding: 12 }}>
            <Text style={{ color: "#ffffff", textAlign: "center" }}>
              No se pudieron guardar cambios ({writeError}). Revisá el almacenamiento antes de cerrar la app.
            </Text>
          </View>
        )}
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="book/add" options={{ headerShown: false }} />
          <Stack.Screen name="session/[bookId]" options={{ headerShown: false }} />
          <Stack.Screen name="goals/configure" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/backup" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="share-stats" options={{ headerShown: false }} />
          <Stack.Screen name="book/share" options={{ headerShown: false }} />
          <Stack.Screen name="book/quotes" options={{ headerShown: false }} />
          <Stack.Screen name="book/quote-form" options={{ headerShown: false }} />
          <Stack.Screen name="recommendations" options={{ headerShown: false }} />
          <Stack.Screen name="lists" options={{ headerShown: false }} />
        </Stack>
        <Toast />
        {(readError || !hydrated) && (
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor }}>
            {readError ? (
              <Text style={{ color, textAlign: "center", fontSize: 16 }}>
                No se pudieron cargar tus datos locales ({readError}). Cerrá y volvé a abrir la app; tus datos no se reemplazaron.
              </Text>
            ) : (
              <ActivityIndicator accessibilityLabel="Cargando datos locales" />
            )}
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
