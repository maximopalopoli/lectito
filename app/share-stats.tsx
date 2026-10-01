import { useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import AnimatedPressable from '@/components/AnimatedPressable';
import ScreenHeader from '@/components/ScreenHeader';
import StatsShareCard from '@/components/StatsShareCard';
import { captureAndShare } from '@/lib/shareCard';
import { getBestStreak, getStreak } from '@/lib/stats';
import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';

export default function ShareStatsScreen() {
  const sessions = useSessionsStore((s) => s.sessions);
  const books = useBooksStore((s) => s.books);
  const viewShotRef = useRef<ViewShotRef>(null);

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
        paddingBottom: 40,
      }}
    >
      <View style={{ alignSelf: 'stretch', marginBottom: 16 }}>
        <ScreenHeader title="Compartir" dark />
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
        accessibilityRole="button"
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
