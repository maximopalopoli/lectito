import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { useTheme } from '@/lib/theme';
import { useBooksStore } from '@/store/books';
import TagBadge from './TagBadge';

interface TagsModalProps {
  visible: boolean;
  bookId: string;
  bookTags: string[];
  onSave: (tags: string[]) => void;
  onClose: () => void;
}

export default function TagsModal({
  visible,
  bookId,
  bookTags,
  onSave,
  onClose,
}: TagsModalProps) {
  const [tags, setTags] = useState<string[]>(bookTags);
  const [input, setInput] = useState('');
  const books = useBooksStore((s) => s.books);
  const colors = useTheme();

  const suggestions = useMemo(() => {
    const all = new Set<string>();
    for (const b of books) {
      if (b.id === bookId) continue;
      for (const t of b.tags ?? []) all.add(t);
    }
    // Exclude tags already on this book
    for (const t of tags) all.delete(t);
    return Array.from(all).sort();
  }, [books, bookId, tags]);

  const filteredSuggestions = useMemo(() => {
    if (!input.trim()) return suggestions;
    const q = input.trim().toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [suggestions, input]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    onSave(tags);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              maxHeight: '80%',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: colors.textPrimary,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Etiquetas
            </Text>

            {/* Current tags */}
            {tags.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 16,
                }}
              >
                {tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    label={tag}
                    onRemove={() => removeTag(tag)}
                  />
                ))}
              </View>
            )}

            {/* Input */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Nueva etiqueta..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => input.trim() && addTag(input)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              />
              <Pressable
                onPress={() => input.trim() && addTag(input)}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 15 }}>
                  +
                </Text>
              </Pressable>
            </View>

            {/* Suggestions */}
            {filteredSuggestions.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textTertiary,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Sugerencias
                </Text>
                <ScrollView
                  style={{ maxHeight: 100 }}
                  contentContainerStyle={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                  }}
                >
                  {filteredSuggestions.map((tag) => (
                    <Pressable key={tag} onPress={() => addTag(tag)}>
                      <TagBadge label={tag} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Save */}
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text
                style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 16 }}
              >
                Guardar
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={{
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
