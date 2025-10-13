import { create } from 'zustand';
import { Place } from '@/lib/places';
import { PlaceFilters } from '@/types/models';
import { Coordinates } from '@/lib/geo';
import type { Place as GooglePlace } from '@/services/places.google';

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
  setSelectedGooglePlace: (place) => set({ selectedGooglePlace: place }),
}));
