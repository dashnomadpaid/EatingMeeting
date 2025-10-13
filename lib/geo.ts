export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.5) {
    return '바로 근처';
  } else if (distanceKm < 1) {
    return '1km 미만';
  } else if (distanceKm < 10) {
    return `약 ${Math.round(distanceKm)}km`;
  } else {
    return '10km 이상';
  }
}

export function obscureLocation(coord: Coordinates): Coordinates {
  return {
    latitude: Math.round(coord.latitude * 100) / 100,
    longitude: Math.round(coord.longitude * 100) / 100,
  };
}

export function isValidCoordinate(coord: Coordinates | null | undefined): boolean {
  if (!coord) return false;
  return (
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180
  );
}
