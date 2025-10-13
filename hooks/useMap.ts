import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useMapStore } from '@/state/map.store';
import { obscureLocation, Coordinates } from '@/lib/geo';
import {
  MOCK_PLACES,
  filterPlacesByCategory,
  filterPlacesByBudget,
  filterPlacesByDistance,
  searchPlaces,
} from '@/lib/places';

export function useCurrentLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentLocation, setCurrentLocation } = useMapStore();

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('위치 권한이 거부되었습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const obscuredCoords = obscureLocation(coords);
      setCurrentLocation(obscuredCoords);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { currentLocation, loading, error, requestLocation };
}

export function useNearbyPlaces() {
  const { currentLocation, filters, places, setPlaces } = useMapStore();

  useEffect(() => {
    if (!currentLocation) return;

    let filtered = [...MOCK_PLACES];

    filtered = filterPlacesByDistance(filtered, currentLocation, filters.maxDistance);

    if (filters.category) {
      filtered = filterPlacesByCategory(filtered, filters.category);
    }

    if (filters.budget) {
      filtered = filterPlacesByBudget(filtered, filters.budget);
    }

    if (filters.searchQuery) {
      filtered = searchPlaces(filtered, filters.searchQuery);
    }

    setPlaces(filtered);
  }, [currentLocation, filters]);

  return { places };
}
