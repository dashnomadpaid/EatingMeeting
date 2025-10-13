import type { Region } from 'react-native-maps';
import { Coordinates } from './geo';

export interface MapMarker {
  id: string;
  coordinate: Coordinates;
  title: string;
  description?: string;
}

export function calculateRegion(
  center: Coordinates,
  radiusKm: number = 2
): Region {
  const latitudeDelta = radiusKm / 111;
  const longitudeDelta =
    radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export function fitMarkersRegion(markers: MapMarker[]): Region | null {
  if (markers.length === 0) return null;

  let minLat = markers[0].coordinate.latitude;
  let maxLat = markers[0].coordinate.latitude;
  let minLng = markers[0].coordinate.longitude;
  let maxLng = markers[0].coordinate.longitude;

  markers.forEach((marker) => {
    minLat = Math.min(minLat, marker.coordinate.latitude);
    maxLat = Math.max(maxLat, marker.coordinate.latitude);
    minLng = Math.min(minLng, marker.coordinate.longitude);
    maxLng = Math.max(maxLng, marker.coordinate.longitude);
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = (maxLat - minLat) * 1.5;
  const lngDelta = (maxLng - minLng) * 1.5;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, 0.01),
    longitudeDelta: Math.max(lngDelta, 0.01),
  };
}
