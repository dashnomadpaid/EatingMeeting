import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Href, useNavigation, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

type BackButtonProps = {
  // label is ignored to match iOS simple chevron style
  label?: string;
  style?: StyleProp<ViewStyle>;
  alwaysShow?: boolean;
  fallbackHref?: Href;
  onPress?: () => void;
};

export function BackButton({
  label = '뒤로',
  style,
  alwaysShow = false,
  fallbackHref,
  onPress,
}: BackButtonProps) {
  const router = useRouter();
  const navigation = useNavigation();

  const canGoBack = navigation?.canGoBack?.();
  if (!canGoBack && !alwaysShow && !fallbackHref && !onPress) {
    return null;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (canGoBack) {
      router.back();
      return;
    }
    if (fallbackHref) {
      router.replace(fallbackHref);
      return;
    }
  };

  return (
    <Pressable
      accessibilityHint="이전 화면으로 이동"
      accessibilityLabel="뒤로가기"
      accessibilityRole="button"
      hitSlop={10}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, style]}
    >
      <ChevronLeft color="#007AFF" size={22} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
