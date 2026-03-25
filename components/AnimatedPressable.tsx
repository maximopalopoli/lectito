import { type ReactNode, useCallback } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPress = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 400 };

interface AnimatedPressableProps extends PressableProps {
  children: ReactNode;
  haptic?: "light" | "medium" | "heavy" | "none";
  scaleDown?: number;
}

export default function AnimatedPressable({
  onPress,
  children,
  haptic = "light",
  scaleDown = 0.97,
  disabled,
  style,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, SPRING_CONFIG);
  }, [scale, scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(
    (e: any) => {
      if (disabled) return;
      if (haptic !== "none") {
        const impact =
          haptic === "heavy"
            ? Haptics.ImpactFeedbackStyle.Heavy
            : haptic === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(impact);
      }
      onPress?.(e);
    },
    [disabled, haptic, onPress],
  );

  return (
    <AnimatedPress
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPress>
  );
}
