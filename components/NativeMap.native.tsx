import React, { forwardRef } from 'react';
import MapViewNative, {
  Marker as NativeMarker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type MapViewProps,
  type Region as NativeRegion,
} from 'react-native-maps';
import { Platform } from 'react-native';

type MarkerDescriptor = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
};

type NativeMapProps = MapViewProps & {
  markers?: MarkerDescriptor[];
};

const NativeMap = forwardRef<MapViewNative, NativeMapProps>(
  ({ markers, provider, showsPointsOfInterest, children, ...rest }, ref) => {
    // Use native map provider (Apple Maps on iOS, Google Maps on Android)
    const effectiveProvider = provider ?? (Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE);
    const effectivePoiSetting = showsPointsOfInterest ?? false;

    return (
      <MapViewNative
        ref={ref}
        provider={effectiveProvider}
        showsPointsOfInterest={effectivePoiSetting}
        {...rest}
      >
        {markers?.map((marker) => (
          <NativeMarker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
          />
        ))}
        {children}
      </MapViewNative>
    );
  },
);

NativeMap.displayName = 'NativeMap';

export default NativeMap;
export { NativeMarker as Marker };
export type { NativeRegion as Region };
export type { MapViewProps };
