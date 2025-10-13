import { create } from 'zustand';
import { Thread, Message, Slot } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  threads: Thread[];
  messages: Record<string, Message[]>;
  proposals: Record<string, Slot[]>;
  unreadCounts: Record<string, number>;
  subscriptions: Record<string, RealtimeChannel>;
  setThreads: (threads: Thread[]) => void;
  setMessages: (threadId: string, messages: Message[]) => void;
  addMessage: (threadId: string, message: Message) => void;
  setProposals: (threadId: string, proposals: Slot[]) => void;
  updateProposal: (threadId: string, proposalId: string, updates: Partial<Slot>) => void;
  subscribeToThread: (threadId: string) => void;
  unsubscribeFromThread: (threadId: string) => void;
  cleanup: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  messages: {},
  proposals: {},
  unreadCounts: {},
  subscriptions: {},

  setThreads: (threads) => set({ threads }),

  setMessages: (threadId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [threadId]: messages },
    })),

  addMessage: (threadId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...(state.messages[threadId] || []), message],
      },
    })),

  setProposals: (threadId, proposals) =>
    set((state) => ({
      proposals: { ...state.proposals, [threadId]: proposals },
    })),

  updateProposal: (threadId, proposalId, updates) =>
    set((state) => {
      const threadProposals = state.proposals[threadId] || [];
      return {
        proposals: {
          ...state.proposals,
          [threadId]: threadProposals.map((p) =>
            p.id === proposalId ? { ...p, ...updates } : p
          ),
        },
      };
    }),

  subscribeToThread: (threadId) => {
    const { subscriptions } = get();
    if (subscriptions[threadId]) return;

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          get().addMessage(threadId, payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
          filter: `thread_id=eq.${threadId}`,
        },
        async () => {
          const { data } = await supabase
            .from('slots')
            .select('*')
            .eq('thread_id', threadId);
          if (data) {
            get().setProposals(threadId, data);
          }
        }
      )
      .subscribe();

    set((state) => ({
      subscriptions: { ...state.subscriptions, [threadId]: channel },
    }));
  },

  unsubscribeFromThread: (threadId) => {
    const { subscriptions } = get();
    const channel = subscriptions[threadId];
    if (channel) {
      channel.unsubscribe();
      const newSubscriptions = { ...subscriptions };
      delete newSubscriptions[threadId];
      set({ subscriptions: newSubscriptions });
    }
  },

  cleanup: () => {
    const { subscriptions } = get();
    Object.values(subscriptions).forEach((channel) => channel.unsubscribe());
    set({ subscriptions: {} });
  },
}));
