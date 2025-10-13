import { create } from 'zustand';
import { Profile, CommunityFilters } from '@/types/models';

interface CommunityState {
  users: Profile[];
  filters: CommunityFilters;
  loading: boolean;
  hasMore: boolean;
  offset: number;
  setUsers: (users: Profile[]) => void;
  appendUsers: (users: Profile[]) => void;
  setFilters: (filters: Partial<CommunityFilters>) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  resetPagination: () => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  users: [],
  filters: {
    maxDistance: 10,
    budget: [],
    headcount: 'any',
    dietTags: [],
  },
  loading: false,
  hasMore: true,
  offset: 0,

  setUsers: (users) => set({ users, offset: 0 }),

  appendUsers: (users) =>
    set((state) => ({
      users: [...state.users, ...users],
      offset: state.offset + users.length,
    })),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  resetPagination: () => set({ offset: 0, hasMore: true, users: [] }),
}));
