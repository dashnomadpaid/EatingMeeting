import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from '@/components/NativeMap';
import type { Region } from 'react-native-maps';
import { useCurrentLocation } from '@/hooks/useMap';
import { Button } from '@/components/Button';
import { fetchNearbyPlaces, type Place as GooglePlace } from '@/services/places.google';
import { MOCK_PLACES } from '@/lib/places';
import { Tag } from '@/components/Tag';
import { useMapStore } from '@/state/map.store';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateDistance } from '@/lib/geo';
import { BackButton } from '@/components/BackButton';

const KOREA_BOUNDS = {
  minLat: 33.0,
  maxLat: 38.9,
  minLng: 124.0,
  maxLng: 132.0,
};
const DEFAULT_DELTA = 0.02;
const CALLOUT_IMAGE_SIZE = 120;
const CLUSTER_DELTA_THRESHOLD = 0.015;
const FALLBACK_GOOGLE_PLACES: GooglePlace[] = MOCK_PLACES.map((place) => ({
  id: `mock-${place.id}`,
  name: place.nameKo ?? place.name,
  address: place.address,
  rating: undefined,
  userRatingsTotal: undefined,
  lat: place.latitude,
  lng: place.longitude,
  types: place.category ? [place.category] : undefined,
  photoUri: null,
  primaryType: 'restaurant',
  primaryTypeDisplayName: place.category ?? null,
  iconBackgroundColor: null,
  iconUri: null,
}));
const MAX_SEARCH_RADIUS_KM = 10;
const MAX_LAT_DELTA = Math.max(0.5, KOREA_BOUNDS.maxLat - KOREA_BOUNDS.minLat - 0.2);
const MAX_LNG_DELTA = Math.max(0.5, KOREA_BOUNDS.maxLng - KOREA_BOUNDS.minLng - 0.2);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function constrainRegion(region: Region): Region {
  const latitudeDelta = clamp(region.latitudeDelta, 0.005, MAX_LAT_DELTA);
  const longitudeDelta = clamp(region.longitudeDelta, 0.005, MAX_LNG_DELTA);
  const latMin = KOREA_BOUNDS.minLat + latitudeDelta / 2;
  const latMax = KOREA_BOUNDS.maxLat - latitudeDelta / 2;
  const lngMin = KOREA_BOUNDS.minLng + longitudeDelta / 2;
  const lngMax = KOREA_BOUNDS.maxLng - longitudeDelta / 2;

  return {
    latitude: clamp(region.latitude, latMin, latMax),
    longitude: clamp(region.longitude, lngMin, lngMax),
    latitudeDelta,
    longitudeDelta,
  };
}

function regionsApproxEqual(a: Region | null, b: Region | null) {
  if (!a || !b) return false;
  const EPS = 0.0001;
  return (
    Math.abs(a.latitude - b.latitude) < EPS &&
    Math.abs(a.longitude - b.longitude) < EPS &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < EPS &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < EPS
  );
}

export default function MapScreen() {
  const { currentLocation, loading: locationLoading, error, requestLocation } = useCurrentLocation();
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<ComponentRef<typeof MapView> | null>(null);
  const markerRefs = useRef<Record<string, ComponentRef<typeof Marker> | null>>({});
  const storeSelectedGooglePlace = useMapStore((state) => state.selectedGooglePlace);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const loadPlaces = useCallback((nextRegion: Region) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);

    const regionForSearch = currentLocation
      ? {
          ...nextRegion,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }
      : nextRegion;

    fetchNearbyPlaces(regionForSearch, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const limited = result.slice(0, 300);
        const withinRadius =
          currentLocation
            ? limited.filter(
                (place) =>
                  calculateDistance(
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    { latitude: place.lat, longitude: place.lng },
                  ) <= MAX_SEARCH_RADIUS_KM,
              )
            : limited;
        setPlaces(withinRadius);
        setPlacesError(null);
        setSelectedPlaceId((prev) => {
          if (prev) {
            const existing = withinRadius.find((place) => place.id === prev);
            if (existing) {
              return prev;
            }
          }
          return null;
        });
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        const message = (cause as Error)?.message ?? '잠시 후 다시 시도해주세요.';
        if (Platform.OS === 'web') {
          console.warn('Places fetch failed (web likely CORS):', message);
        } else {
          Alert.alert('장소를 불러오지 못했어요', message);
        }
        const fallbackPlaces =
          currentLocation
            ? FALLBACK_GOOGLE_PLACES.filter(
                (place) =>
                  calculateDistance(
                    { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                    { latitude: place.lat, longitude: place.lng },
                  ) <= MAX_SEARCH_RADIUS_KM,
              )
            : FALLBACK_GOOGLE_PLACES;
        setPlaces(fallbackPlaces);
        setPlacesError(message);
        setSelectedPlaceId(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFetching(false);
        }
      });
  }, [currentLocation]);

  useEffect(() => {
    if (!selectedPlaceId) {
      if (storeSelectedGooglePlace !== null) {
        setSelectedGooglePlace(null);
      }
      return;
    }
    const next = places.find((place) => place.id === selectedPlaceId) ?? null;
    if (!next) {
      if (storeSelectedGooglePlace !== null) {
        setSelectedGooglePlace(null);
      }
      return;
    }
    if (storeSelectedGooglePlace?.id !== next.id) {
      setSelectedGooglePlace(next);
    }
  }, [selectedPlaceId, places, storeSelectedGooglePlace, setSelectedGooglePlace]);

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      const constrained = constrainRegion(nextRegion);
      setRegion((prev) => (regionsApproxEqual(prev, constrained) ? prev : constrained));
      if (!regionsApproxEqual(nextRegion, constrained)) {
        const latDiff = Math.abs(nextRegion.latitude - constrained.latitude);
        const lngDiff = Math.abs(nextRegion.longitude - constrained.longitude);
        const latDeltaDiff = Math.abs(nextRegion.latitudeDelta - constrained.latitudeDelta);
        const lngDeltaDiff = Math.abs(nextRegion.longitudeDelta - constrained.longitudeDelta);
        if (
          latDiff > 0.0008 ||
          lngDiff > 0.0008 ||
          latDeltaDiff > 0.002 ||
          lngDeltaDiff > 0.002
        ) {
          if (mapRef.current && 'animateToRegion' in mapRef.current) {
            mapRef.current.animateToRegion(constrained, 160);
          }
        }
        return;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => loadPlaces(constrained), 600);
    },
    [loadPlaces],
  );

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    const nextRegion: Region = {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    };
    const constrained = constrainRegion(nextRegion);
    setRegion(constrained);
    loadPlaces(constrained);
  }, [currentLocation, loadPlaces]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedPlaceId || Platform.OS === 'web') return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const attempt = (retriesRemaining: number) => {
      const ref = markerRefs.current[selectedPlaceId];
      if (ref && typeof (ref as any).showCallout === 'function') {
        try {
          (ref as any).showCallout();
        } catch (err) {
          console.warn('Failed to show callout', err);
        }
        return;
      }
      if (retriesRemaining > 0) {
        timeout = setTimeout(() => attempt(retriesRemaining - 1), 80);
      }
    };
    attempt(5);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [selectedPlaceId]);

  const handleCalloutPress = useCallback(
    (place: GooglePlace) => {
      setSelectedPlaceId(place.id);
      setSelectedGooglePlace(place);
      setShowList(false);
      router.push({
        pathname: '/place/[id]',
        params: { id: place.id },
      });
    },
    [setSelectedGooglePlace, setSelectedPlaceId, setShowList],
  );

  const renderCalloutContent = useCallback(
    (place: GooglePlace) => (
      <View style={styles.calloutContainer}>
        <View style={styles.callout}>
          {place.photoUri ? (
            <Image
              source={{ uri: place.photoUri }}
              style={styles.calloutImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.calloutImage, styles.calloutImagePlaceholder]}>
              <Text style={styles.calloutPlaceholderText}>사진 없음</Text>
            </View>
          )}
          <View style={styles.calloutBody}>
            <Text style={styles.calloutTitle}>{place.name}</Text>
            {place.address ? <Text style={styles.calloutSubtitle}>{place.address}</Text> : null}
            <View style={styles.calloutMetaRow}>
              {typeof place.rating === 'number' ? (
                <Text style={styles.calloutRating}>
                  ⭐ {place.rating.toFixed(1)}
                  {place.userRatingsTotal ? ` (${place.userRatingsTotal})` : ''}
                </Text>
              ) : null}
              {place.primaryTypeDisplayName ? (
                <Tag label={place.primaryTypeDisplayName} type="category" />
              ) : place.types?.length ? (
                <Tag label={place.types[0]} type="category" />
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.calloutArrow} />
      </View>
    ),
    [],
  );

  if (locationLoading && !currentLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.message}>위치 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (error && !currentLocation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{error}</Text>
        <Button title="다시 시도" onPress={requestLocation} />
      </View>
    );
  }

  if (!currentLocation || !region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>주변 장소를 보려면 위치 권한이 필요합니다.</Text>
        <Button title="위치 사용하기" onPress={requestLocation} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        provider={PROVIDER_GOOGLE}
      >
        {!isWeb &&
          places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              onPress={() => {
                setSelectedPlaceId(place.id);
              }}
              ref={(node) => {
                if (node) {
                  markerRefs.current[place.id] = node;
                } else {
                  delete markerRefs.current[place.id];
                }
              }}
            >
              <Callout tooltip onPress={() => handleCalloutPress(place)}>
                {renderCalloutContent(place)}
              </Callout>
            </Marker>
          ))}
      </MapView>
      {!showList ? (
        <View style={[styles.topControls, { top: insets.top + 12 }]}>
          <TouchableOpacity style={styles.listButton} onPress={() => setShowList(true)}>
            <Text style={styles.listButtonText}>목록 보기</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {placesError ? (
        <View style={[styles.errorBanner, { top: insets.top + 60 }]}>
          <Text style={styles.errorBannerText} numberOfLines={2}>
            주변 장소 정보를 불러오지 못했어요. 기본 추천 목록을 대신 보여드릴게요.
          </Text>
        </View>
      ) : null}
      {fetching ? (
        <View style={[styles.loader, { top: insets.top + 56 }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loaderText}>주변 장소 업데이트 중...</Text>
        </View>
      ) : null}
      {showList ? (
        <View style={[styles.listContainer, { paddingTop: insets.top + 12 }]}>
          <View style={styles.listHeader}>
            <BackButton alwaysShow onPress={() => setShowList(false)} />
            <Text style={styles.listTitle}>주변 식당 목록</Text>
            <View style={{ width: 44 }} />
          </View>
          <FlatList
            data={places}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => {
                  setSelectedPlaceId(item.id);
                  setShowList(false);
                  if (mapRef.current && 'animateToRegion' in mapRef.current && region) {
                    const nextDelta = Math.min(
                      region.latitudeDelta,
                      CLUSTER_DELTA_THRESHOLD * 0.9,
                    );
                    mapRef.current.animateToRegion(
                      {
                        latitude: item.lat,
                        longitude: item.lng,
                        latitudeDelta: nextDelta,
                        longitudeDelta: nextDelta,
                      },
                      350,
                    );
                  }
                  setShowList(false);
                }}
              >
                <View style={styles.listItemHeader}>
                  <Text style={styles.listItemTitle}>{item.name}</Text>
                  {typeof item.rating === 'number' ? (
                    <Text style={styles.listItemRating}>
                      ⭐ {item.rating.toFixed(1)}
                      {item.userRatingsTotal ? ` · ${item.userRatingsTotal}` : ''}
                    </Text>
                  ) : null}
                </View>
                {item.address ? <Text style={styles.listItemAddress}>{item.address}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.listEmpty}>
                <Text style={styles.listEmptyText}>표시할 장소가 없습니다.</Text>
              </View>
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  message: {
    fontSize: 16,
    color: '#555555',
    marginTop: 12,
    textAlign: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  listButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  listButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 12,
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.92)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 6,
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  calloutContainer: {
    alignItems: 'center',
  },
  callout: {
    width: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  calloutImage: {
    width: '100%',
    height: CALLOUT_IMAGE_SIZE,
    backgroundColor: '#EFEFEF',
  },
  calloutImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutPlaceholderText: {
    color: '#777777',
    fontSize: 12,
  },
  calloutBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  calloutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
  },
  calloutRating: {
    fontSize: 12,
    color: '#FF6B35',
    marginRight: 12,
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: '#FFFFFF',
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  listContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  listContent: {
    paddingBottom: 16,
  },
  listItem: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    flex: 1,
    marginRight: 12,
  },
  listItemRating: {
    fontSize: 12,
    color: '#FF874B',
  },
  listItemAddress: {
    marginTop: 4,
    fontSize: 12,
    color: '#666666',
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listEmptyText: {
    fontSize: 14,
    color: '#777777',
  },
});
