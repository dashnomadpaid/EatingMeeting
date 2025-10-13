import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@/types/models';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileChecked: boolean; // whether a profile fetch attempt completed
  profileError?: boolean; // last profile fetch errored
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

function buildFallbackProfile(userId: string, session?: Session | null): Profile {
  const fallbackUser = session?.user;
  const now = new Date().toISOString();
  const metadata = (fallbackUser?.user_metadata ?? {}) as Record<string, unknown>;
  const metaDisplayName = metadata.full_name ?? metadata.display_name;
  const nameFromEmail = fallbackUser?.email?.split('@')[0];
  const displayName =
    (typeof metaDisplayName === 'string' && metaDisplayName.trim().length > 0
      ? metaDisplayName.trim()
      : undefined) ?? nameFromEmail ?? '밥친구';

  const createdAt = fallbackUser?.created_at ?? now;

  return {
    id: userId,
    display_name: displayName,
    bio: '',
    diet_tags: [],
    budget_range: 'medium',
    time_slots: [],
    approx_lat: null,
    approx_lng: null,
    push_token: null,
    created_at: createdAt,
    updated_at: createdAt,
    photos: [],
  } as Profile;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  profileChecked: false,
  profileError: false,

  setSession: (session) => set({ session }),

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    const currentSession = get().session;
    const fallback = () => {
      const synthetic = buildFallbackProfile(userId, currentSession);
      set({ profile: synthetic, profileChecked: true, profileError: true });
      return synthetic;
    };

    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.warn('[AUTH:fetchProfile] profiles query error', profileErr.message);
        return fallback();
      }

      if (!profile) {
        console.log('[AUTH:fetchProfile] profile missing, synthesizing fallback');
        return fallback();
      }

      const { data: photos, error: photosErr } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_primary', { ascending: false });

      if (photosErr) {
        console.warn('[AUTH:fetchProfile] photos query error', photosErr.message);
      }

      const hydrated: Profile = {
        ...profile,
        photos: photos || [],
        primaryPhoto: photos?.find((p) => p.is_primary) || photos?.[0],
      };

      set({ profile: hydrated, profileChecked: true, profileError: false });
      return hydrated;
    } catch (err) {
      console.warn('[AUTH:fetchProfile] unexpected error', (err as Error)?.message);
      return fallback();
    }
  },

  logout: async () => {
    // 1) Tear down realtime channels immediately
    try { (supabase as any).realtime?.removeAllChannels?.(); } catch {}

    // 2) Clear in-memory auth state immediately for UI
    set({ session: null, profile: null, loading: false, profileChecked: false, profileError: false });

    // 3) Try to sign out locally and globally with timeouts (avoid hangs)
    const withTimeout = async <T,>(p: Promise<T>, ms = 4000) =>
      Promise.race<T>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), ms)) as any,
      ]);
    try { await withTimeout(supabase.auth.signOut({ scope: 'local' } as any), 2500); } catch (e) { console.warn('Local signOut failed', e); }
    try { await withTimeout(supabase.auth.signOut({ scope: 'global' } as any), 4000); } catch (e) { console.warn('Global signOut failed', e); }

    // 4) Purge stored tokens aggressively to prevent session resurrection
    try {
      const keys = await AsyncStorage.getAllKeys();
      const candidates = keys.filter(
        (k) =>
          k === 'supabase.auth.token' || // legacy
          k === 'sb-eatingmeeting-auth' || // our configured storageKey
          (k.startsWith('sb-') && k.endsWith('-auth-token')) // default supabase pattern
      );
      if (candidates.length) {
        await Promise.all(candidates.map((k) => AsyncStorage.removeItem(k)));
      }
    } catch (e) {
      console.warn('Failed to purge Supabase auth tokens from storage', e);
    }
  },

  initialize: async () => {
    let safety: ReturnType<typeof setTimeout> | undefined;
    try {
      // Safety: ensure loading never hangs indefinitely.
      safety = setTimeout(() => {
        console.log('[AUTH:init] safety-timeout → loading=false');
        try { set({ loading: false }); } catch {}
      }, 5000);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('[AUTH:init] session=', session?.user?.id ?? null);
      set({ session });

      if (session?.user) {
        await get().fetchProfile(session.user.id);
      } else {
        set({ profile: null, profileChecked: false, profileError: false });
      }
    } finally {
      console.log('[AUTH:init] loading=false');
      set({ loading: false });
      try { if (safety) clearTimeout(safety); } catch {}
    }
  },
}));
