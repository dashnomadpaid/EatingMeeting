import React from 'react';
import Constants from 'expo-constants';

type Props = React.PropsWithChildren<{}>;

export function KeyboardProviderCompat({ children }: Props) {
  // Avoid requiring the module in Expo Go, which doesn't have the native part
  if (Constants?.appOwnership === 'expo') {
    return <>{children}</>;
  }
  try {
    // Dynamically require to avoid crashing when the native module isn't available (e.g., Expo Go)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { KeyboardProvider } = require('react-native-keyboard-controller');
    return <KeyboardProvider>{children}</KeyboardProvider>;
  } catch (_) {
    return <>{children}</>;
  }
}

export default KeyboardProviderCompat;
