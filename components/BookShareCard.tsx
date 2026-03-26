import { Image, Text, View } from 'react-native';

import type { Book } from '@/types';

const STATUS_LABEL: Record<Book['status'], string> = {
  TBR: 'Quiero leer',
  READING: 'Leyendo',
  DONE: 'Leido',
  DNF: 'Abandonado',
};

export default function BookShareCard({ book }: { book: Book }) {
  const progress = book.pageCount > 0 ? book.currentPage / book.pageCount : 0;

  return (
    <View
      style={{
        width: 360,
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
      }}
    >
      {/* Cover */}
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={{
            width: 140,
            height: 210,
            borderRadius: 10,
            marginBottom: 24,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 140,
            height: 210,
            borderRadius: 10,
            backgroundColor: '#2a2a4a',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 48 }}>📖</Text>
        </View>
      )}

      {/* Title & Author */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 6,
        }}
        numberOfLines={2}
      >
        {book.title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: '#aaa',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {book.authors.join(', ')}
      </Text>

      {/* Status / Progress */}
      <View
        style={{
          backgroundColor: '#2a2a4a',
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 20,
          alignItems: 'center',
          width: '100%',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
          {STATUS_LABEL[book.status]}
        </Text>

        {book.status === 'READING' && (
          <>
            <View
              style={{
                height: 6,
                backgroundColor: '#3a3a5a',
                borderRadius: 3,
                width: '100%',
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 6,
                  backgroundColor: '#60A5FA',
                  borderRadius: 3,
                  width: `${Math.min(progress * 100, 100)}%`,
                }}
              />
            </View>
            <Text style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
              {book.currentPage} / {book.pageCount} paginas ({Math.round(progress * 100)}%)
            </Text>
          </>
        )}

        {book.status === 'DONE' && book.completedAt && (
          <Text style={{ fontSize: 13, color: '#60A5FA' }}>
            Terminado el {new Date(book.completedAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Branding */}
      <Text style={{ fontSize: 12, color: '#555', marginTop: 16, letterSpacing: 2 }}>
        ALEPH
      </Text>
    </View>
  );
}
