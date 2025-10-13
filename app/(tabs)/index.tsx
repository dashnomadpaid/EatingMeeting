import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
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
import MapView, { Marker, type Region } from '@/components/NativeMap';
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
const DEBUG_PLACE_SYNC = true;
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
  const abortRef = useRef<AbortController | null>(null);
  const fetchCounterRef = useRef(0);
  const mapRef = useRef<ComponentRef<typeof MapView> | null>(null);
  const storeSelectedGooglePlace = useMapStore((state) => state.selectedGooglePlace);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const selectedGooglePlaceRef = useRef<GooglePlace | null>(storeSelectedGooglePlace);

  useEffect(() => {
    selectedGooglePlaceRef.current = storeSelectedGooglePlace;
  }, [storeSelectedGooglePlace]);

  const loadPlaces = useCallback((nextRegion: Region) => {
    abortRef.current?.abort();

    const regionForSearch = currentLocation
      ? {
          ...nextRegion,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }
      : nextRegion;

    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);

    const requestId = fetchCounterRef.current + 1;
    fetchCounterRef.current = requestId;
    console.log(
      `[Places][${requestId}] ▶ start`,
      `lat=${regionForSearch.latitude.toFixed(4)}`,
      `lng=${regionForSearch.longitude.toFixed(4)}`,
    );

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
        console.log(
          `[Places][${requestId}] ✓ success`,
          `received=${withinRadius.length}`,
          `raw=${limited.length}`,
        );
        setPlaces(withinRadius);
        setPlacesError(null);
        const currentSelected = selectedGooglePlaceRef.current;
        if (currentSelected) {
          const stillExists = withinRadius.some((place) => place.id === currentSelected.id);
          if (!stillExists && withinRadius.length > 0) {
            if (DEBUG_PLACE_SYNC) {
              console.log(
                `[MAP] selection cleared (missing from results) id=${currentSelected.id} remaining=${withinRadius.length}`,
              );
            }
            setSelectedGooglePlace(null);
          }
        }
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        const message = (cause as Error)?.message ?? '잠시 후 다시 시도해주세요.';
        console.log(`[Places][${requestId}] ✗ error`, message);
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
        const currentSelected = selectedGooglePlaceRef.current;
        if (currentSelected) {
          const stillExists = fallbackPlaces.some((place) => place.id === currentSelected.id);
          if (!stillExists && fallbackPlaces.length > 0) {
            if (DEBUG_PLACE_SYNC) {
              console.log(
                `[MAP] selection cleared (fallback list mismatch) id=${currentSelected.id} remaining=${fallbackPlaces.length}`,
              );
            }
            setSelectedGooglePlace(null);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          console.log(`[Places][${requestId}] ⏹ finish`);
          setFetching(false);
        }
      });
  }, [currentLocation, setSelectedGooglePlace]);

  useEffect(() => {
    if (!storeSelectedGooglePlace || places.length === 0) {
      return;
    }
    const exists = places.some((place) => place.id === storeSelectedGooglePlace.id);
    if (!exists) {
      if (DEBUG_PLACE_SYNC) {
        console.log(
          `[MAP] selection cleared (effect sync) id=${storeSelectedGooglePlace.id} list=${places.length}`,
        );
      }
      setSelectedGooglePlace(null);
    }
  }, [places, storeSelectedGooglePlace, setSelectedGooglePlace]);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
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
    }
  }, []);

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
    };
  }, []);

  const selectedPlace = useMemo(() => {
    if (!storeSelectedGooglePlace) {
      return null;
    }
    const inList = places.find((place) => place.id === storeSelectedGooglePlace.id);
    return inList ?? storeSelectedGooglePlace;
  }, [places, storeSelectedGooglePlace]);

  const handleCalloutPress = useCallback(
    (place: GooglePlace) => {
      setSelectedGooglePlace(place);
      setShowList(false);
      router.push({
        pathname: '/place/[id]',
        params: { id: place.id },
      });
    },
    [setSelectedGooglePlace, setShowList],
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
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
      >
        {!isWeb &&
          places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              onPress={() => {
                setSelectedGooglePlace(place);
              }}
              pinColor={storeSelectedGooglePlace?.id === place.id ? '#FF6B35' : '#FF9E62'}
            />
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
      {!showList && selectedPlace ? (
        <TouchableOpacity
          style={[styles.selectedOverlay, { bottom: insets.bottom + 24 }]}
          activeOpacity={0.85}
          onPress={() => handleCalloutPress(selectedPlace)}
        >
          <View style={styles.selectedCard}>
            {selectedPlace.photoUri ? (
              <Image
                source={{ uri: selectedPlace.photoUri }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.selectedImage, styles.calloutImagePlaceholder]}>
                <Text style={styles.calloutPlaceholderText}>사진 없음</Text>
              </View>
            )}
            <View style={styles.selectedBody}>
              <Text style={styles.calloutTitle}>{selectedPlace.name}</Text>
              {selectedPlace.address ? (
                <Text style={styles.calloutSubtitle}>{selectedPlace.address}</Text>
              ) : null}
              <View style={styles.calloutMetaRow}>
                {typeof selectedPlace.rating === 'number' ? (
                  <Text style={styles.calloutRating}>
                    ⭐ {selectedPlace.rating.toFixed(1)}
                    {selectedPlace.userRatingsTotal ? ` (${selectedPlace.userRatingsTotal})` : ''}
                  </Text>
                ) : null}
                {selectedPlace.primaryTypeDisplayName ? (
                  <Tag label={selectedPlace.primaryTypeDisplayName} type="category" />
                ) : selectedPlace.types?.length ? (
                  <Tag label={selectedPlace.types[0]} type="category" />
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
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
                  setSelectedGooglePlace(item);
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
  calloutImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutPlaceholderText: {
    color: '#777777',
    fontSize: 12,
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
  selectedOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  selectedCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  selectedImage: {
    width: '100%',
    height: CALLOUT_IMAGE_SIZE,
    backgroundColor: '#EFEFEF',
  },
  selectedBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
