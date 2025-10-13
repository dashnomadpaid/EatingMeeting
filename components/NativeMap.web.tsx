// components/NativeMap.web.tsx
// Web 전용: 네이티브 전용 API를 import하지 않도록 완전한 플레이스홀더 구현
import * as React from 'react';
import { View, Text } from 'react-native';

// 호출부가 기대할 수 있는 상수/컴포넌트/타입을 모두 제공
export const PROVIDER_DEFAULT = 'web';
export const PROVIDER_GOOGLE = 'web';
export const Marker: React.FC<any> = () => null;
export const Callout: React.FC<any> = ({ children }) => <View>{children}</View>;

// 실제 MapView에서 흔히 쓰는 prop들을 넉넉하게 받아도 무시(no-op)
export type MapViewProps = React.PropsWithChildren<{
  style?: any;
  initialRegion?: any;
  region?: any;
  onRegionChange?: (...args: any[]) => void;
  onRegionChangeComplete?: (...args: any[]) => void;
  showsUserLocation?: boolean;
  provider?: any;
}>;

export default function WebMapPlaceholder({
  style,
  children,
}: MapViewProps) {
  return (
    <View
      style={[
        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F6F6', padding: 12 },
        style,
      ]}
    >
      <Text style={{ color: '#444', marginBottom: 6, textAlign: 'center' }}>
        웹에서는 지도를 사용할 수 없습니다. Expo Go(iOS/Android)에서 열어 확인해주세요.
      </Text>
      {children ? <View>{children}</View> : null}
    </View>
  );
}
