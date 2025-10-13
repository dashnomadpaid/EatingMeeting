import React from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';

type Props = React.PropsWithChildren<{}>;

export default function KeyboardInset({ children }: Props) {
  // Avoid loading native worklets in Expo Go where versions may mismatch
  if (Constants?.appOwnership === 'expo') {
    return <View>{children}</View>;
  }
  try {
    // Dynamically require modules so import-time doesn't crash in unsupported environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Reanimated = require('react-native-reanimated');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useKeyboardAnimation } = require('react-native-keyboard-controller');

    const { useAnimatedStyle } = Reanimated;
    const { height } = useKeyboardAnimation();
    const animatedStyle = useAnimatedStyle(() => ({ paddingBottom: height.value }));

    const AnimatedView = Reanimated.View ?? Reanimated.default?.View;
    return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
  } catch (_) {
    return <View>{children}</View>;
  }
}

