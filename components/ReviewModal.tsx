import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useTheme } from '@/lib/theme';
import StarRating from './StarRating';

interface ReviewModalProps {
  visible: boolean;
  initialRating?: number | null;
  initialReview?: string | null;
  onSave: (rating: number | null, review: string | null) => void;
  onSkip: () => void;
}

export default function ReviewModal({
  visible,
  initialRating = null,
  initialReview = null,
  onSave,
  onSkip,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview ?? '');
  const colors = useTheme();

  const handleSave = () => {
    onSave(rating, review.trim() || null);
  };

  const handleSkip = () => {
    setRating(initialRating);
    setReview(initialReview ?? '');
    onSkip();
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
              ¿Qué te pareció?
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <StarRating rating={rating} onRate={setRating} size={36} />
            </View>

            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder="Escribe tu reseña..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: colors.textPrimary,
                minHeight: 100,
                marginBottom: 20,
              }}
            />

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
              <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 16 }}>
                Guardar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              style={{
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>Omitir</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
