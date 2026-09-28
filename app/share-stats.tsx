import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';

import AnimatedPressable from '@/components/AnimatedPressable';
import StatsShareCard from '@/components/StatsShareCard';
import { captureAndShare } from '@/lib/shareCard';
import { getBestStreak, getStreak } from '@/lib/stats';
import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';

export default function ShareStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);
  const viewShotRef = useRef<ViewShot>(null);

  const stats = useMemo(() => {
    const booksRead = books.filter((b) => b.status === 'DONE').length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const totalPages = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
    const currentStreak = getStreak(sessions);
    const bestStreak = getBestStreak(sessions);
    return {
      booksRead,
      totalMinutes,
      totalPages,
      currentStreak,
      bestStreak,
      totalSessions: sessions.length,
    };
  }, [sessions, books]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000' }}
      contentContainerStyle={{
        alignItems: 'center',
        paddingTop: insets.top + 16,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingHorizontal: 16,
          marginBottom: 24,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>← Volver</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
          Compartir
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Card preview */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
      >
        <StatsShareCard {...stats} />
      </ViewShot>

      {/* Share button */}
      <AnimatedPressable
        onPress={() => captureAndShare(viewShotRef)}
        haptic="medium"
        style={{
          backgroundColor: '#007AFF',
          paddingVertical: 14,
          paddingHorizontal: 40,
          borderRadius: 12,
          marginTop: 32,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
          Compartir imagen
        </Text>
      </AnimatedPressable>
    </ScrollView>
  );
}
