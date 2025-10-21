import { create } from 'zustand';
import { Gathering, GatheringParticipant } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GatheringState {
  gatherings: Gathering[];
  participants: Record<string, GatheringParticipant[]>;
  myGatherings: Gathering[];
  loading: boolean;
  subscriptions: Record<string, RealtimeChannel>;
  
  setGatherings: (gatherings: Gathering[]) => void;
  addGathering: (gathering: Gathering) => void;
  updateGathering: (gatheringId: string, updates: Partial<Gathering>) => void;
  removeGathering: (gatheringId: string) => void;
  
  setParticipants: (gatheringId: string, participants: GatheringParticipant[]) => void;
  upsertParticipant: (gatheringId: string, participant: GatheringParticipant) => void;
  removeParticipant: (gatheringId: string, userId: string) => void;
  
  setMyGatherings: (gatherings: Gathering[]) => void;
  setLoading: (loading: boolean) => void;
  
  subscribeToGathering: (gatheringId: string) => void;
  unsubscribeFromGathering: (gatheringId: string) => void;
  cleanup: () => void;
}

export const useGatheringStore = create<GatheringState>((set, get) => ({
  gatherings: [],
  participants: {},
  myGatherings: [],
  loading: false,
  subscriptions: {},
  
  setGatherings: (gatherings) => set({ gatherings }),
  
  addGathering: (gathering) =>
    set((state) => ({
      gatherings: [gathering, ...state.gatherings],
    })),
  
  updateGathering: (gatheringId, updates) =>
    set((state) => ({
      gatherings: state.gatherings.map((g) =>
        g.id === gatheringId ? { ...g, ...updates } : g
      ),
      myGatherings: state.myGatherings.map((g) =>
        g.id === gatheringId ? { ...g, ...updates } : g
      ),
    })),
  
  removeGathering: (gatheringId) =>
    set((state) => ({
      gatherings: state.gatherings.filter((g) => g.id !== gatheringId),
      myGatherings: state.myGatherings.filter((g) => g.id !== gatheringId),
    })),
  
  setParticipants: (gatheringId, participants) =>
    set((state) => ({
      participants: { ...state.participants, [gatheringId]: participants },
    })),
  
  upsertParticipant: (gatheringId, participant) =>
    set((state) => {
      const existing = state.participants[gatheringId] || [];
      const index = existing.findIndex((p) => p.user_id === participant.user_id);
      const nextParticipants =
        index === -1
          ? [...existing, participant]
          : [
              ...existing.slice(0, index),
              participant,
              ...existing.slice(index + 1),
            ];
      return {
        participants: {
          ...state.participants,
          [gatheringId]: nextParticipants,
        },
      };
    }),
  
  removeParticipant: (gatheringId, userId) =>
    set((state) => ({
      participants: {
        ...state.participants,
        [gatheringId]: (state.participants[gatheringId] || []).filter(
          (p) => p.user_id !== userId
        ),
      },
    })),
  
  setMyGatherings: (gatherings) => set({ myGatherings: gatherings }),
  
  setLoading: (loading) => set({ loading }),
  
  subscribeToGathering: (gatheringId) => {
    const { subscriptions } = get();
    if (subscriptions[gatheringId]) return;
    
    const channel = supabase
      .channel(`gathering:${gatheringId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gatherings',
          filter: `id=eq.${gatheringId}`,
        },
        (payload) => {
          get().updateGathering(gatheringId, payload.new as Gathering);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gathering_participants',
          filter: `gathering_id=eq.${gatheringId}`,
        },
        (payload) => {
          const participant = payload.new as GatheringParticipant;
          if (participant.status === 'left') {
            get().removeParticipant(gatheringId, participant.user_id);
          } else {
            get().upsertParticipant(gatheringId, participant);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gathering_participants',
          filter: `gathering_id=eq.${gatheringId}`,
        },
        (payload) => {
          const participant = payload.new as GatheringParticipant;
          if (participant.status === 'left') {
            get().removeParticipant(gatheringId, participant.user_id);
          } else {
            get().upsertParticipant(gatheringId, participant);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'gathering_participants',
          filter: `gathering_id=eq.${gatheringId}`,
        },
        (payload) => {
          const participant = payload.old as GatheringParticipant;
          get().removeParticipant(gatheringId, participant.user_id);
        }
      )
      .subscribe();
    
    set((state) => ({
      subscriptions: { ...state.subscriptions, [gatheringId]: channel },
    }));
  },
  
  unsubscribeFromGathering: (gatheringId) => {
    const { subscriptions } = get();
    const channel = subscriptions[gatheringId];
    if (channel) {
      channel.unsubscribe();
      const newSubscriptions = { ...subscriptions };
      delete newSubscriptions[gatheringId];
      set({ subscriptions: newSubscriptions });
    }
  },
  
  cleanup: () => {
    const { subscriptions } = get();
    Object.values(subscriptions).forEach((channel) => channel.unsubscribe());
    set({ subscriptions: {} });
  },
}));
