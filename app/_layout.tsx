import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="book/add" options={{ headerShown: false }} />
      <Stack.Screen name="session/[bookId]" options={{ headerShown: false }} />
      <Stack.Screen name="goals/configure" options={{ headerShown: false }} />
      <Stack.Screen name="settings/backup" options={{ headerShown: false }} />
    </Stack>
  );
}
