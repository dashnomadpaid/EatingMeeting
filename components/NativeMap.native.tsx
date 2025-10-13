// components/NativeMap.native.tsx
// iOS/Android 전용: 실제 react-native-maps를 그대로 노출
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type MapViewProps,
} from 'react-native-maps';

export default MapView;
export { Callout, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE };
export type { MapViewProps };
