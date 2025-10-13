// Google Places (v1) nearby search for restaurants & cafes
// Mobile-first: works in Expo Go/dev client. Web may hit CORS (acceptable for MVP).

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type Place = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  lat: number;
  lng: number;
  types?: string[];
  photoUri?: string | null;
  primaryType?: string | null;
  primaryTypeDisplayName?: string | null;
  iconBackgroundColor?: string | null;
  iconUri?: string | null;
};

const API = 'https://places.googleapis.com/v1/places:searchNearby';
const PHOTO_API = 'https://places.googleapis.com/v1';
const PAGE_SIZE = 20;
const MAX_RESULTS = 200;

// latitudeDelta -> approximate meters (clamped)
function regionToCenterRadius(region: Region) {
  const meters = Math.max(200, Math.min(10_000, (region.latitudeDelta * 111_000) / 2));
  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    radius: Math.round(meters),
  };
}

export async function fetchNearbyPlaces(region: Region, signal?: AbortSignal): Promise<Place[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY as string | undefined;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');

  const { center, radius } = regionToCenterRadius(region);
  const baseBody = {
    includedTypes: ['restaurant', 'cafe'],
    maxResultCount: PAGE_SIZE,
    locationRestriction: { circle: { center, radius } },
  };

  const collected: Place[] = [];
  let pageToken: string | undefined;

  while (collected.length < MAX_RESULTS) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const body = pageToken ? { pageToken } : baseBody;
    const resp = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.location',
          'places.types',
          'places.shortFormattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.photos',
          'places.iconMaskBaseUri',
          'places.iconBackgroundColor',
          'places.primaryType',
          'places.primaryTypeDisplayName',
        ].join(','),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Places ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const items = (data.places ?? []) as any[];
    collected.push(
      ...items
        .map((p) => ({
          id: p.id,
          name: p.displayName?.text ?? 'Unknown',
          address: p.shortFormattedAddress,
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          userRatingsTotal: p.userRatingCount,
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          types: p.types,
          photoUri: buildPhotoUri(p.photos?.[0]?.name, key),
          primaryType: p.primaryType ?? null,
          primaryTypeDisplayName: p.primaryTypeDisplayName?.text ?? null,
          iconBackgroundColor: p.iconBackgroundColor ?? null,
          iconUri: buildIconUri(p.iconMaskBaseUri),
        }))
        .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number'),
    );

    pageToken = data.nextPageToken;
    if (!pageToken || collected.length >= MAX_RESULTS) {
      break;
    }

    // Google may need a short delay before nextPageToken becomes valid.
    await wait(1200, signal);
  }

  return collected.slice(0, MAX_RESULTS);
}

function buildPhotoUri(photoName: string | undefined, key: string) {
  if (!photoName) return null;
  return `${PHOTO_API}/${photoName}/media?maxWidthPx=400&key=${key}`;
}

function buildIconUri(baseUri?: string) {
  if (!baseUri) return null;
  return `${baseUri}.png`;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}
