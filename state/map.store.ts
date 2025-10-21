import { create } from 'zustand';
import { Place } from '@/lib/places';
import { PlaceFilters } from '@/types/models';
import { Coordinates } from '@/lib/geo';
import type { Place as GooglePlace } from '@/services/places.google';

function shortId(id?: string | null) {
  if (!id) return 'none';
  return id.length > 6 ? `${id.slice(0, 6)}…` : id;
}

interface MapState {
  currentLocation: Coordinates | null;
  places: Place[];
  googlePlaces: GooglePlace[];
  filters: PlaceFilters;
  selectedPlace: Place | null;
  selectedGooglePlace: GooglePlace | null;
  // Map theme for dynamic StatusBar control
  // 'light' = bright map (day mode) → use dark StatusBar (black text)
  // 'dark' = dark map (night mode) → use light StatusBar (white text)
  mapTheme: 'light' | 'dark';
  setCurrentLocation: (location: Coordinates | null) => void;
  setPlaces: (places: Place[]) => void;
  setGooglePlaces: (places: GooglePlace[]) => void;
  setFilters: (filters: Partial<PlaceFilters>) => void;
  selectPlace: (place: Place | null) => void;
  setSelectedGooglePlace: (place: GooglePlace | null) => void;
  setMapTheme: (theme: 'light' | 'dark') => void;
}

export const useMapStore = create<MapState>((set) => ({
  currentLocation: null,
  places: [],
  googlePlaces: [],
  selectedPlace: null,
  selectedGooglePlace: null,
  mapTheme: 'light', // Default to light theme (bright map, dark StatusBar)
  filters: {
    category: null,
    budget: null,
    maxDistance: 5,
    searchQuery: '',
  },

  setCurrentLocation: (location) => set({ currentLocation: location }),

  setPlaces: (places) => set({ places }),

  setGooglePlaces: (places) => set({ googlePlaces: places }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  selectPlace: (place) => set({ selectedPlace: place }),
  
  setMapTheme: (theme) => set({ mapTheme: theme }),
  setSelectedGooglePlace: (place) =>
    set((state) => {
      const prev = state.selectedGooglePlace;
      const prevLabel = shortId(prev?.id);
      const nextLabel = shortId(place?.id);
      if (prev?.id === place?.id) {
        console.log(`[MAP] ↻ selection unchanged (${prevLabel})`);
        return state;
      }
      if (!prev && !place) {
        console.log('[MAP] ↻ selection already empty');
        return state;
      }
      console.log(`[MAP] → selection ${prevLabel} → ${nextLabel}`);
      return { selectedGooglePlace: place };
    }),
}));
