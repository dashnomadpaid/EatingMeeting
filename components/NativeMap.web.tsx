import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MarkerDescriptor = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
};

type NativeMapProps = {
  region: Region;
  markers?: MarkerDescriptor[];
  onRegionChangeComplete?: (region: Region) => void;
  style?: any;
  children?: React.ReactNode;
};

declare global {
  interface Window {
    google?: typeof google;
  }
}

const MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const loadGoogleMapsAPI = (() => {
  let promise: Promise<void> | null = null;

  return () => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Google Maps API cannot load on the server.'));
    }

    if (window.google?.maps) {
      return Promise.resolve();
    }

    if (!MAPS_API_KEY) {
      return Promise.reject(
        new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (or fallback EXPO_PUBLIC_GOOGLE_PLACES_API_KEY)'),
      );
    }

    if (!promise) {
      promise = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error('Failed to load Google Maps JavaScript API script.'));
        document.head.appendChild(script);
      });
    }

    return promise;
  };
})();

function flattenStyle(style: any): React.CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<React.CSSProperties>(
      (acc, item) => Object.assign(acc, flattenStyle(item)),
      {},
    );
  }
  if (typeof style === 'object') {
    return style as React.CSSProperties;
  }
  return {};
}

function regionToZoom(latitudeDelta: number): number {
  if (!latitudeDelta || latitudeDelta <= 0) {
    return 14;
  }
  const zoom = Math.log2(360 / latitudeDelta);
  return Math.max(3, Math.min(21, Math.round(zoom + 1)));
}

const Marker: React.FC<any> = () => null;
Marker.displayName = 'NativeMapMarker';

const MapView = forwardRef<any, NativeMapProps>(
  ({ region, markers, onRegionChangeComplete, style, children }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const programmaticMoveRef = useRef(false);
    const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

  const childMarkers = useMemo<MarkerDescriptor[]>(() => {
    const items: MarkerDescriptor[] = [];
    React.Children.forEach(children, (child, index) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as {
        coordinate?: { latitude: number; longitude: number };
        title?: string;
        identifier?: string;
      };
      if (!props?.coordinate) return;
      items.push({
        id:
          child.key?.toString() ??
          props.identifier ??
          props.title ??
          `marker-child-${index}`,
        latitude: props.coordinate.latitude,
        longitude: props.coordinate.longitude,
        title: props.title,
      });
    });
    return items;
  }, [children]);

  const combinedMarkers = useMemo<MarkerDescriptor[]>(() => {
    const list: MarkerDescriptor[] = [];
    markers?.forEach((marker) =>
      list.push({
        id: marker.id,
        latitude: marker.latitude,
        longitude: marker.longitude,
        title: marker.title,
      }),
    );
    childMarkers.forEach((marker) => list.push(marker));
    return list;
  }, [markers, childMarkers]);

    useEffect(() => {
      let isMounted = true;

      setLoadError(null);

      loadGoogleMapsAPI()
        .then(() => {
          if (!isMounted || !containerRef.current || !window.google?.maps) return;

          const initialOptions: google.maps.MapOptions = {
            center: { lat: region.latitude, lng: region.longitude },
            zoom: regionToZoom(region.latitudeDelta),
            disableDefaultUI: true,
            gestureHandling: 'greedy',
          };

          const map = new window.google.maps.Map(containerRef.current, initialOptions);
          mapRef.current = map;

          idleListenerRef.current = map.addListener('idle', () => {
            if (!mapRef.current) return;
            const currentMap = mapRef.current;
            const bounds = currentMap.getBounds();
            const center = currentMap.getCenter();
            if (!bounds || !center) return;

            const northEast = bounds.getNorthEast();
            const southWest = bounds.getSouthWest();
            const latDelta = Math.abs(northEast.lat() - southWest.lat());
            const lngDelta = Math.abs(northEast.lng() - southWest.lng());

            const nextRegion: Region = {
              latitude: center.lat(),
              longitude: center.lng(),
              latitudeDelta: latDelta || region.latitudeDelta,
              longitudeDelta: lngDelta || region.longitudeDelta,
            };

            if (programmaticMoveRef.current) {
              programmaticMoveRef.current = false;
              return;
            }

            onRegionChangeComplete?.(nextRegion);
          });
        })
        .catch((error) => {
          console.warn('[NativeMap.web] Google Maps API failed to load', error);
          if (!isMounted) return;
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Google Maps JavaScript API를 불러오는 데 실패했습니다.',
          );
        });

    return () => {
      isMounted = false;
      if (idleListenerRef.current) {
        idleListenerRef.current.remove();
        idleListenerRef.current = null;
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    const currentLat = center?.lat() ?? region.latitude;
    const currentLng = center?.lng() ?? region.longitude;
    const latDiff = Math.abs(currentLat - region.latitude);
    const lngDiff = Math.abs(currentLng - region.longitude);
    const targetZoom = regionToZoom(region.latitudeDelta);
    const currentZoom = map.getZoom() ?? targetZoom;

    if (latDiff > 0.0005 || lngDiff > 0.0005) {
      programmaticMoveRef.current = true;
      map.panTo({ lat: region.latitude, lng: region.longitude });
    }

    if (Math.abs(currentZoom - targetZoom) > 0.1) {
      programmaticMoveRef.current = true;
      map.setZoom(targetZoom);
    }
  }, [region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = combinedMarkers.map(
      (marker) =>
        new window.google.maps.Marker({
          map,
          position: { lat: marker.latitude, lng: marker.longitude },
          title: marker.title,
        }),
    );
  }, [combinedMarkers]);

  const mergedStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      ...flattenStyle(style),
    }),
    [style],
  );

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (targetRegion: Region) => {
        const map = mapRef.current;
        if (!map) return;
        programmaticMoveRef.current = true;
        map.panTo({ lat: targetRegion.latitude, lng: targetRegion.longitude });
        map.setZoom(regionToZoom(targetRegion.latitudeDelta));
      },
    }),
    [],
  );

  if (loadError) {
    return (
      <div
        style={{
          ...mergedStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          textAlign: 'center',
          backgroundColor: '#F7F7F7',
          color: '#444444',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {loadError}
        <br />
        <span style={{ fontSize: 12, color: '#777777' }}>
          웹 개발 서버 도메인(`http://localhost` 등)이 Google Cloud 콘솔의 허용 referrer에 포함되어 있고
          Maps JavaScript API가 활성화되어 있는지 확인하세요.
        </span>
      </div>
    );
  }

  return <div ref={containerRef} style={mergedStyle} />;
});

MapView.displayName = 'NativeMapWeb';

export default MapView;
export { Marker };
