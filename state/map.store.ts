import { create } from 'zustand';
import { Place } from '@/lib/places';
import { PlaceFilters } from '@/types/models';
import { Coordinates } from '@/lib/geo';
import type { Place as GooglePlace } from '@/services/places.google';

function formatPlaceId(id?: string | null) {
  return id ?? 'none';
}

interface MapState {
  currentLocation: Coordinates | null;
  places: Place[];
  filters: PlaceFilters;
  selectedPlace: Place | null;
  selectedGooglePlace: GooglePlace | null;
  setCurrentLocation: (location: Coordinates | null) => void;
  setPlaces: (places: Place[]) => void;
  setFilters: (filters: Partial<PlaceFilters>) => void;
  selectPlace: (place: Place | null) => void;
  setSelectedGooglePlace: (place: GooglePlace | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentLocation: null,
  places: [],
  selectedPlace: null,
  selectedGooglePlace: null,
  filters: {
    category: null,
    budget: null,
    maxDistance: 5,
    searchQuery: '',
  },

  setCurrentLocation: (location) => set({ currentLocation: location }),

  setPlaces: (places) => set({ places }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  selectPlace: (place) => set({ selectedPlace: place }),
  setSelectedGooglePlace: (place) =>
    set((state) => {
      const prev = state.selectedGooglePlace;
      console.log(
        `[MAP] selection call prev=${formatPlaceId(prev?.id)} next=${formatPlaceId(place?.id)}`,
      );
      if (prev?.id === place?.id) {
        console.log(`[MAP] selection unchanged id=${formatPlaceId(prev?.id)}`);
        return state;
      }
      if (!prev && !place) {
        console.log('[MAP] selection already empty');
        return state;
      }
      console.log(
        `[MAP] selection update ${formatPlaceId(prev?.id)} -> ${formatPlaceId(place?.id)}`,
      );
      return { selectedGooglePlace: place };
    }),
}));
