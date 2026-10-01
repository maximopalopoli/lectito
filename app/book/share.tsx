import { useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ViewShot from 'react-native-view-shot';

import AnimatedPressable from '@/components/AnimatedPressable';
import ScreenHeader from '@/components/ScreenHeader';
import BookShareCard from '@/components/BookShareCard';
import { captureAndShare } from '@/lib/shareCard';
import { useBooksStore } from '@/store/books';

export default function ShareBookScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const books = useBooksStore((s) => s.books);
  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);
  const viewShotRef = useRef<ViewShot>(null);

  if (!book) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#888', fontSize: 16 }}>Libro no encontrado</Text>
      </View>
    );
  }

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
        <BookShareCard book={book} />
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
