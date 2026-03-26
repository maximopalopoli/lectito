import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AnimatedPressable from '@/components/AnimatedPressable';
import { useQuotesStore } from '@/store/quotes';
import type { QuoteColor } from '@/types';

const COLORS: { value: QuoteColor; hex: string }[] = [
  { value: 'yellow', hex: '#FBBF24' },
  { value: 'blue', hex: '#60A5FA' },
  { value: 'green', hex: '#34D399' },
  { value: 'pink', hex: '#F472B6' },
  { value: 'purple', hex: '#A78BFA' },
];

export default function QuoteFormScreen() {
  const { bookId, quoteId } = useLocalSearchParams<{
    bookId: string;
    quoteId?: string;
  }>();
  const router = useRouter();

  const allQuotes = useQuotesStore((s) => s.quotes);
  const addQuote = useQuotesStore((s) => s.addQuote);
  const updateQuote = useQuotesStore((s) => s.updateQuote);

  const existing = useMemo(
    () => (quoteId ? allQuotes.find((q) => q.id === quoteId) : undefined),
    [allQuotes, quoteId],
  );

  const [text, setText] = useState(existing?.text ?? '');
  const [pageStr, setPageStr] = useState(
    existing?.pageNumber != null ? String(existing.pageNumber) : '',
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [color, setColor] = useState<QuoteColor>(existing?.color ?? 'yellow');

  const isEditing = !!existing;
  const canSave = text.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const pageNumber = pageStr ? parseInt(pageStr, 10) : null;
    const trimmedNote = note.trim() || null;

    if (isEditing) {
      updateQuote(existing.id, {
        text: text.trim(),
        pageNumber: isNaN(pageNumber as number) ? null : pageNumber,
        note: trimmedNote,
        color,
      });
    } else {
      addQuote(
        bookId,
        text.trim(),
        isNaN(pageNumber as number) ? null : pageNumber,
        trimmedNote,
        color,
      );
    }

    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#007AFF', fontSize: 16 }}>Cancelar</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '600' }}>
          {isEditing ? 'Editar cita' : 'Nueva cita'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={{ paddingHorizontal: 24, gap: 20 }}>
        {/* Quote text */}
        <View>
          <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
            Cita *
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribe o pega la cita..."
            multiline
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Page number */}
        <View>
          <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
            Pagina (opcional)
          </Text>
          <TextInput
            value={pageStr}
            onChangeText={setPageStr}
            placeholder="Numero de pagina"
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
            }}
          />
        </View>

        {/* Note */}
        <View>
          <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
            Nota personal (opcional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Tu reflexion sobre esta cita..."
            multiline
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              padding: 14,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Color picker */}
        <View>
          <Text style={{ fontWeight: '600', fontSize: 15, marginBottom: 8 }}>
            Color
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {COLORS.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => setColor(c.value)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c.hex,
                  borderWidth: color === c.value ? 3 : 0,
                  borderColor: '#333',
                }}
              />
            ))}
          </View>
        </View>

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          haptic="medium"
          style={{
            backgroundColor: canSave ? '#007AFF' : '#ccc',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            {isEditing ? 'Guardar cambios' : 'Agregar cita'}
          </Text>
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}
