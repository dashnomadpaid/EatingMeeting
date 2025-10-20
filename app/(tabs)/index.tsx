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
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, type Region } from '@/components/NativeMap';
import { useCurrentLocation } from '@/hooks/useMap';
import { Button } from '@/components/Button';
import { fetchNearbyPlaces, type Place as GooglePlace } from '@/services/places.google';
import { MOCK_PLACES } from '@/lib/places';
import { Tag } from '@/components/Tag';
import { StarRating } from '@/components/StarRating';
import { useMapStore } from '@/state/map.store';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateDistance } from '@/lib/geo';
import { fitMarkersRegion } from '@/lib/maps';
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
const WINDOW_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(WINDOW_WIDTH * 0.8, 320);
const CARD_SPACING = 16;
const CARD_PEEK_PADDING = (WINDOW_WIDTH - CARD_WIDTH) / 2 - CARD_SPACING / 2;

function shortPlaceId(id?: string | null) {
  if (!id) return 'none';
  return id.length > 6 ? `${id.slice(0, 6)}…` : id;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function constrainRegion(region: Region): Region {
  // Allow much tighter zoom for detailed viewing (0.0005 ≈ ~55m at equator)
  const latitudeDelta = clamp(region.latitudeDelta, 0.0005, MAX_LAT_DELTA);
  const longitudeDelta = clamp(region.longitudeDelta, 0.0005, MAX_LNG_DELTA);
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

// Separate component for carousel card to use hooks properly
function CarouselCard({
  item,
  index,
  activeIndex,
  isActive,
  onPress,
}: {
  item: GooglePlace;
  index: number;
  activeIndex: number;
  isActive: boolean;
  onPress: () => void;
}) {
  // ✅ Always initialize to inactive state (0.92/0.6) to prevent reused cards from flashing
  // The useEffect will immediately animate to active state if needed
  const animatedScale = useRef(new Animated.Value(0.92)).current;
  const animatedOpacity = useRef(new Animated.Value(0.6)).current;

  // Animate card state based on isActive prop
  useEffect(() => {
    if (isActive) {
      // Active card: spring animation for bouncy feel
      Animated.spring(animatedScale, {
        toValue: 1.08,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      // Inactive card: smooth timing animation
      Animated.timing(animatedScale, {
        toValue: 0.92,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(animatedOpacity, {
        toValue: 0.6,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, animatedScale, animatedOpacity]);

  return (
    <Animated.View
      style={[
        styles.carouselCardWrapper,
        {
          transform: [{ scale: animatedScale }],
          opacity: animatedOpacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.carouselCardTouchable}
        onPress={onPress}
      >
        <View style={[styles.selectedCard, isActive ? styles.selectedCardActive : null]}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.selectedImage} resizeMode="cover" />
          ) : (
            <View style={[styles.selectedImage, styles.calloutImagePlaceholder]}>
              <Text style={styles.calloutPlaceholderText}>사진 없음</Text>
            </View>
          )}
          <View style={styles.selectedBody}>
            <Text style={styles.calloutTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {item.address ? (
              <Text style={styles.calloutSubtitle} numberOfLines={1}>
                {item.address}
              </Text>
            ) : null}
            <View style={styles.calloutMetaRow}>
              {item.primaryTypeDisplayName ? (
                <Tag label={item.primaryTypeDisplayName} type="category" />
              ) : item.types?.length ? (
                <Tag label={item.types[0]} type="category" />
              ) : null}
              <StarRating 
                rating={item.rating} 
                size={12}
                showCount={true}
                userRatingsTotal={item.userRatingsTotal}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MapScreen() {
  const { currentLocation, loading: locationLoading, error, requestLocation } = useCurrentLocation();
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [isCarouselVisible, setCarouselVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const abortRef = useRef<AbortController | null>(null);
  const fetchCounterRef = useRef(0);
  const mapRef = useRef<ComponentRef<typeof MapView> | null>(null);
  const carouselRef = useRef<FlatList<GooglePlace> | null>(null);
  const isAnimatingToMarkerRef = useRef(false); // Track if we're currently animating to a marker selection
  const isProgrammaticCarouselScrollRef = useRef(false);
  const pendingProgrammaticScrollIndexRef = useRef<number | null>(null);
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeSelectedGooglePlace = useMapStore((state) => state.selectedGooglePlace);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);
  const setGooglePlaces = useMapStore((state) => state.setGooglePlaces);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const selectedGooglePlaceRef = useRef<GooglePlace | null>(storeSelectedGooglePlace);

  // ✅ Optimization: O(1) place lookup with Map
  const placeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    places.forEach((place, index) => {
      map.set(place.id, index);
    });
    return map;
  }, [places]);

  useEffect(() => {
    selectedGooglePlaceRef.current = storeSelectedGooglePlace;
  }, [storeSelectedGooglePlace]);

  const clearProgrammaticCarouselScrollFlag = useCallback(() => {
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = null;
    }
    isProgrammaticCarouselScrollRef.current = false;
  }, []);

  const markProgrammaticCarouselScroll = useCallback((duration: number) => {
    isProgrammaticCarouselScrollRef.current = true;
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }
    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticCarouselScrollRef.current = false;
      programmaticScrollTimeoutRef.current = null;
    }, duration);
  }, []);

  const attemptProgrammaticScrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!carouselRef.current) {
        return false;
      }
      const duration = animated ? 450 : 60;
      markProgrammaticCarouselScroll(duration);
      try {
        // ✅ Calculate offset that centers the card perfectly
        // Each card takes (CARD_WIDTH + CARD_SPACING) of space
        const scrollOffset = (CARD_WIDTH + CARD_SPACING) * index;
        
        carouselRef.current.scrollToOffset({ 
          offset: scrollOffset, 
          animated 
        });
        return true;
      } catch (error) {
        clearProgrammaticCarouselScrollFlag();
        throw error;
      }
    },
    [clearProgrammaticCarouselScrollFlag, markProgrammaticCarouselScroll],
  );

  useEffect(() => {
    return () => {
      clearProgrammaticCarouselScrollFlag();
    };
  }, [clearProgrammaticCarouselScrollFlag]);

  // ✅ Optimized: Update activeIndex when store selection changes (O(1) Map lookup)
  useEffect(() => {
    if (!storeSelectedGooglePlace) {
      setActiveIndex(-1);
      setCarouselVisible(false);
      return;
    }
    
    // ✅ Show carousel when place is selected
    setCarouselVisible(true);
    
    // ✅ O(1) lookup instead of O(n) findIndex
    const index = placeIndexMap.get(storeSelectedGooglePlace.id) ?? -1;
    
    if (__DEV__) {
      console.log('[Effect] Syncing activeIndex:', index, 'for place:', storeSelectedGooglePlace.id);
    }
    
    if (index !== -1 && index !== activeIndex) {
      pendingProgrammaticScrollIndexRef.current = index;
      markProgrammaticCarouselScroll(600);
      setActiveIndex(index);
    }
  }, [places, storeSelectedGooglePlace, activeIndex, placeIndexMap, markProgrammaticCarouselScroll]);

  // Scroll carousel when activeIndex changes (from marker click or list selection)
  useEffect(() => {
    if (!isCarouselVisible || activeIndex < 0) {
      return;
    }
    if (pendingProgrammaticScrollIndexRef.current !== activeIndex) {
      return;
    }
    const targetIndex = activeIndex;
    requestAnimationFrame(() => {
      try {
        if (attemptProgrammaticScrollToIndex(targetIndex, true)) {
          pendingProgrammaticScrollIndexRef.current = null;
        }
      } catch {
        setTimeout(() => {
          try {
            if (attemptProgrammaticScrollToIndex(targetIndex, true)) {
              pendingProgrammaticScrollIndexRef.current = null;
            }
          } catch {
            pendingProgrammaticScrollIndexRef.current = null;
          }
        }, 100);
      }
    });
  }, [attemptProgrammaticScrollToIndex, isCarouselVisible, activeIndex]);

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
        
        // Sort by longitude (ascending): West (smaller lng) → left, East (larger lng) → right
        const sortedByLongitude = [...withinRadius].sort((a, b) => a.lng - b.lng);
        
        console.log(
          `[Places][${requestId}] ✓ success`,
          `received=${sortedByLongitude.length}`,
          `raw=${limited.length}`,
          `sorted by longitude (west→east)`,
        );
        setPlaces(sortedByLongitude);
        setGooglePlaces(sortedByLongitude);
        setPlacesError(null);
        const currentSelected = selectedGooglePlaceRef.current;
        if (currentSelected) {
          const stillExists = sortedByLongitude.some((place) => place.id === currentSelected.id);
          if (!stillExists && sortedByLongitude.length > 0) {
            if (DEBUG_PLACE_SYNC) {
              console.log(
                `[MAP] ✂ pruned from results id=${shortPlaceId(currentSelected.id)} remaining=${sortedByLongitude.length}`,
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
        
        // Sort fallback places by longitude (west → east) too
        const sortedFallback = [...fallbackPlaces].sort((a, b) => a.lng - b.lng);
        
        setPlaces(sortedFallback);
        setGooglePlaces(sortedFallback);
        setPlacesError(message);
        const currentSelected = selectedGooglePlaceRef.current;
        if (currentSelected) {
          const stillExists = sortedFallback.some((place) => place.id === currentSelected.id);
          if (!stillExists && sortedFallback.length > 0) {
            if (DEBUG_PLACE_SYNC) {
              console.log(
                `[MAP] ✂ pruned (fallback) id=${shortPlaceId(currentSelected.id)} remaining=${sortedFallback.length}`,
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
          `[MAP] ✂ effect sync id=${shortPlaceId(storeSelectedGooglePlace.id)} list=${places.length}`,
        );
      }
      setSelectedGooglePlace(null);
    }
  }, [places, storeSelectedGooglePlace, setSelectedGooglePlace]);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
    // Skip if we're currently animating to a marker selection to prevent conflicts
    if (isAnimatingToMarkerRef.current) {
      console.log('[RegionChange] Skipping - marker animation in progress');
      return;
    }
    
    // Update internal region state for reference (but don't pass to MapView as controlled prop)
    const constrained = constrainRegion(nextRegion);
    setRegion((prev) => (regionsApproxEqual(prev, constrained) ? prev : constrained));
    
    // Only animate if significantly out of bounds
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
    
    // Animate to initial location smoothly
    if (mapRef.current && 'animateToRegion' in mapRef.current) {
      setTimeout(() => {
        mapRef.current && 'animateToRegion' in mapRef.current && mapRef.current.animateToRegion(constrained, 800);
      }, 100);
    }
  }, [currentLocation, loadPlaces]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Fit all markers in view when places change (unless a specific marker is selected)
  useEffect(() => {
    if (places.length === 0 || !mapRef.current || isAnimatingToMarkerRef.current) {
      return;
    }
    
    // Don't auto-fit if user has selected a specific place
    if (storeSelectedGooglePlace && isCarouselVisible) {
      return;
    }
    
    const markers = places.map(place => ({
      id: place.id,
      coordinate: { latitude: place.lat, longitude: place.lng },
      title: place.name,
    }));
    
    const fittedRegion = fitMarkersRegion(markers);
    if (fittedRegion && 'animateToRegion' in mapRef.current) {
      // Apply minimal constraints to ensure all markers are visible
      const constrained: Region = {
        latitude: clamp(fittedRegion.latitude, KOREA_BOUNDS.minLat, KOREA_BOUNDS.maxLat),
        longitude: clamp(fittedRegion.longitude, KOREA_BOUNDS.minLng, KOREA_BOUNDS.maxLng),
        latitudeDelta: Math.min(fittedRegion.latitudeDelta, MAX_LAT_DELTA),
        longitudeDelta: Math.min(fittedRegion.longitudeDelta, MAX_LNG_DELTA),
      };
      console.log('[Places] Fitting all markers in view:', places.length, 'places', constrained);
      setTimeout(() => {
        if (mapRef.current && 'animateToRegion' in mapRef.current) {
          mapRef.current.animateToRegion(constrained, 800);
        }
      }, 300);
    }
  }, [places, storeSelectedGooglePlace, isCarouselVisible]);

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
      router.push({
        pathname: '/place/[id]',
        params: { id: place.id },
      });
    },
    [setSelectedGooglePlace],
  );

  const handleMarkerPress = useCallback(
    (place: GooglePlace) => {
      if (__DEV__) {
        console.log('[MarkerPress] Selected place:', place.id, place.name);
      }
      
      // ✅ O(1) lookup with Map
      const index = placeIndexMap.get(place.id) ?? -1;
      
      if (__DEV__) {
        console.log('[MarkerPress] Place index:', index, '/', places.length);
      }
      
      if (index === -1) {
        if (__DEV__) {
          console.warn('[MarkerPress] Place not found in list!');
        }
        return;
      }

      // Set flag to prevent handleRegionChangeComplete from interfering
      isAnimatingToMarkerRef.current = true;
      if (__DEV__) {
        console.log('[MarkerPress] Animation flag set to true');
      }

      // Calculate target region
      const currentDelta = region
        ? Math.min(region.latitudeDelta, CLUSTER_DELTA_THRESHOLD * 0.9)
        : DEFAULT_DELTA;
      const nextRegion = constrainRegion({
        latitude: place.lat,
        longitude: place.lng,
        latitudeDelta: currentDelta,
        longitudeDelta: currentDelta,
      });

      // Update UI states (but NOT setRegion - let map animate freely)
      setCarouselVisible(true);
      pendingProgrammaticScrollIndexRef.current = index;
      markProgrammaticCarouselScroll(600);
      setActiveIndex(index);
      setSelectedGooglePlace(place);
      
      // Animate map to selected place smoothly
      if (mapRef.current && 'animateToRegion' in mapRef.current) {
        if (__DEV__) {
          console.log('[MarkerPress] Animating to region:', nextRegion);
        }
        mapRef.current.animateToRegion(nextRegion, 500);
      }

      // Clear animation flag after animation completes
      setTimeout(() => {
        isAnimatingToMarkerRef.current = false;
        if (__DEV__) {
          console.log('[MarkerPress] Animation flag cleared');
        }
      }, 750); // Slightly longer than animation duration

      // Scroll carousel to selected card with delay for state update
      setTimeout(() => {
        if (pendingProgrammaticScrollIndexRef.current !== index) {
          return;
        }
        try {
          if (__DEV__) {
            console.log('[MarkerPress] Scrolling to index:', index);
          }
          if (attemptProgrammaticScrollToIndex(index, true)) {
            pendingProgrammaticScrollIndexRef.current = null;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[MarkerPress] Scroll failed, retrying...', error);
          }
          setTimeout(() => {
            if (pendingProgrammaticScrollIndexRef.current !== index) {
              return;
            }
            try {
              if (attemptProgrammaticScrollToIndex(index, false)) {
                pendingProgrammaticScrollIndexRef.current = null;
              }
            } catch (e) {
              pendingProgrammaticScrollIndexRef.current = null;
              console.error('[MarkerPress] Second scroll attempt failed', e);
            }
          }, 120);
        }
      }, 50);
    },
    [attemptProgrammaticScrollToIndex, markProgrammaticCarouselScroll, places, region, setSelectedGooglePlace],
  );

  const handleMapPress = useCallback(
    (event: { nativeEvent: { action?: string } }) => {
      if (event.nativeEvent?.action === 'marker-press') return;
      setCarouselVisible(false);
      setSelectedGooglePlace(null);
    },
    [setSelectedGooglePlace],
  );

  const handleFitAllMarkers = useCallback(() => {
    if (places.length === 0 || !mapRef.current) return;
    
    const markers = places.map(place => ({
      id: place.id,
      coordinate: { latitude: place.lat, longitude: place.lng },
      title: place.name,
    }));
    
    const fittedRegion = fitMarkersRegion(markers);
    if (fittedRegion && 'animateToRegion' in mapRef.current) {
      // Apply constraints but ensure all markers are visible
      // Only constrain center point, let deltas be as needed for all markers
      const constrained: Region = {
        latitude: clamp(fittedRegion.latitude, KOREA_BOUNDS.minLat, KOREA_BOUNDS.maxLat),
        longitude: clamp(fittedRegion.longitude, KOREA_BOUNDS.minLng, KOREA_BOUNDS.maxLng),
        latitudeDelta: Math.min(fittedRegion.latitudeDelta, MAX_LAT_DELTA),
        longitudeDelta: Math.min(fittedRegion.longitudeDelta, MAX_LNG_DELTA),
      };
      console.log('[FitAllMarkers] Showing all', places.length, 'markers', constrained);
      setCarouselVisible(false);
      setSelectedGooglePlace(null);
      mapRef.current.animateToRegion(constrained, 800);
    }
  }, [places, setSelectedGooglePlace]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + CARD_SPACING,
      // ✅ Offset matches scrollToOffset calculation - no PEEK_PADDING needed here
      // because contentContainerStyle already adds the padding
      offset: (CARD_WIDTH + CARD_SPACING) * index,
      index,
    }),
    [],
  );

  // ✅ Removed duplicate viewabilityConfig (defined in viewabilityConfigPairs below)

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      if (!isCarouselVisible || viewableItems.length === 0) {
        return;
      }
      if (isProgrammaticCarouselScrollRef.current) {
        return;
      }
      const first = viewableItems.find((item) => item.index !== null && item.index !== undefined);
      if (first?.index === undefined || first.index === null) {
        return;
      }
      if (first.index === activeIndex) {
        return;
      }
      const nextPlace = places[first.index];
      if (!nextPlace) {
        return;
      }
      setActiveIndex(first.index);
      if (nextPlace.id !== storeSelectedGooglePlace?.id) {
        setSelectedGooglePlace(nextPlace);
        const delta = region
          ? Math.min(region.latitudeDelta, CLUSTER_DELTA_THRESHOLD * 0.9)
          : DEFAULT_DELTA;
        const nextRegion = constrainRegion({
          latitude: nextPlace.lat,
          longitude: nextPlace.lng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        });
        // Smooth animation without setRegion
        if (mapRef.current && 'animateToRegion' in mapRef.current) {
          if (__DEV__) {
            console.log('[ViewableChanged] Animating to:', nextPlace.name);
          }
          mapRef.current.animateToRegion(nextRegion, 500);
        }
      }
    },
    [activeIndex, isCarouselVisible, places, region, setSelectedGooglePlace, storeSelectedGooglePlace],
  );

  // Store latest handler in ref to avoid recreating viewabilityConfigCallbackPairs
  const viewabilityHandlerRef = useRef(handleViewableItemsChanged);
  useEffect(() => {
    viewabilityHandlerRef.current = handleViewableItemsChanged;
  }, [handleViewableItemsChanged]);

  // Stable viewabilityConfigCallbackPairs - never changes after mount
  const viewabilityConfigPairs = useMemo(
    () => [
      {
        viewabilityConfig: { itemVisiblePercentThreshold: 80 },
        onViewableItemsChanged: (info: { viewableItems: Array<{ index?: number | null }> }) => {
          viewabilityHandlerRef.current(info);
        },
      },
    ],
    [], // Empty deps - created once and never changes
  );

  const handleScrollToIndexFailed = useCallback(
    ({ index }: { index: number }) => {
      setTimeout(() => {
        if (index < places.length) {
          try {
            if (attemptProgrammaticScrollToIndex(index, true)) {
              if (pendingProgrammaticScrollIndexRef.current === index) {
                pendingProgrammaticScrollIndexRef.current = null;
              }
            }
          } catch {}
        }
      }, 200);
    },
    [attemptProgrammaticScrollToIndex, places.length],
  );

  const renderCarouselItem = useCallback(
    ({ item, index }: { item: GooglePlace; index: number }) => {
      return (
        <CarouselCard
          item={item}
          index={index}
          activeIndex={activeIndex}
          isActive={index === activeIndex} // ✅ O(1) comparison instead of string equality
          onPress={() => handleCalloutPress(item)}
        />
      );
    },
    [activeIndex, handleCalloutPress, storeSelectedGooglePlace?.id],
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
        onPress={handleMapPress}
        showsUserLocation
      >
        {!isWeb &&
          places.map((place, idx) => {
            const isActive = storeSelectedGooglePlace?.id === place.id;
            const isActiveByIndex = idx === activeIndex;
            const shouldHighlight = isActive || isActiveByIndex;
            
            return (
              <Marker
                key={place.id}
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                onPress={() => handleMarkerPress(place)}
                pinColor={shouldHighlight ? '#FF6B35' : '#FF9E62'}
                zIndex={shouldHighlight ? 10 : 1}
              />
            );
          })}
      </MapView>
      <View style={[styles.topControls, { top: insets.top + 12 }]}>
        {places.length > 1 && (
          <TouchableOpacity 
            style={styles.listButton} 
            onPress={handleFitAllMarkers}
          >
            <Text style={styles.listButtonText}>전체 보기</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.listButton, places.length > 1 && { marginLeft: 8 }]} 
          onPress={() => router.push('/map/list')}
        >
          <Text style={styles.listButtonText}>목록 보기</Text>
        </TouchableOpacity>
      </View>
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
      {places.length > 0 && isCarouselVisible ? (
        <View style={[styles.carouselContainer, { bottom: insets.bottom + 24 }]}>
          <FlatList
            ref={carouselRef}
            data={places}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            keyExtractor={(item) => item.id}
            renderItem={renderCarouselItem}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            bounces={false}
            getItemLayout={getItemLayout}
            viewabilityConfigCallbackPairs={viewabilityConfigPairs}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            extraData={storeSelectedGooglePlace?.id}
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
    flexDirection: 'row',
    alignItems: 'center',
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
  carouselContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  carouselContent: {
    paddingHorizontal: CARD_PEEK_PADDING,
    paddingBottom: 12,
    paddingTop: 16,
  },
  carouselCardWrapper: {
    width: CARD_WIDTH + CARD_SPACING,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: CARD_SPACING / 2,
  },
  carouselCardTouchable: {
    width: CARD_WIDTH,
  },
  selectedCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  selectedCardActive: {
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 16,
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
});
