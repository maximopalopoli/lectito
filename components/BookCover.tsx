import { useState } from "react";
import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme";

interface BookCoverProps {
  uri?: string | null;
  width: number;
  height: number;
  radius?: number;
}

export default function BookCover({ uri, width, height, radius = 6 }: BookCoverProps) {
  const colors = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={{ width, height, borderRadius: radius }}
        resizeMode="cover"
        onError={() => setFailedUri(uri)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.surfaceAlt,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="book-outline" size={Math.min(width * 0.5, 40)} color={colors.textTertiary} />
    </View>
  );
}
