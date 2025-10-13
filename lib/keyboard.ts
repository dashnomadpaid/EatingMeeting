import { useAnimatedStyle } from 'react-native-reanimated';
import Constants from 'expo-constants';

export function useKeyboardInsetAnimatedStyle() {
  // In Expo Go (appOwnership === 'expo'), avoid requiring the native module
  if (Constants?.appOwnership === 'expo') {
    return useAnimatedStyle(() => ({ paddingBottom: 0 }));
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useKeyboardAnimation } = require('react-native-keyboard-controller');
    const { height } = useKeyboardAnimation();
    return useAnimatedStyle(() => ({ paddingBottom: height.value }));
  } catch (_) {
    return useAnimatedStyle(() => ({ paddingBottom: 0 }));
  }
}
