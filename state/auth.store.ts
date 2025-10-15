import { create } from 'zustand';
import { Session, type PostgrestSingleResponse } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@/types/models';
import { supabase } from '@/lib/supabase';

function shortId(value?: string | null) {
  if (!value) return 'none';
  return value.length > 6 ? `${value.slice(0, 6)}…` : value;
}

const PROFILE_FETCH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, reason: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(reason)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileChecked: boolean; // whether a profile fetch attempt completed
  profileError?: boolean; // last profile fetch errored
  profileErrorReason?: string | null;
  profilePending: boolean; // fetchProfile currently running
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

const profileFetchInFlight = new Map<string, Promise<Profile | null>>();

export function buildFallbackProfile(userId: string, session?: Session | null): Profile {
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
  profileErrorReason: null,
  profilePending: false,

  setSession: (session) => {
    console.log(`[AUTH:setSession] → ${shortId(session?.user?.id)}`);
    set({ session });
  },

  setProfile: (profile) => {
    console.log(`[AUTH:setProfile] → ${shortId((profile as any)?.id)}`);
    set({ profile, profileErrorReason: null });
  },

  fetchProfile: async (userId) => {
    if (profileFetchInFlight.has(userId)) {
      return profileFetchInFlight.get(userId)!;
    }

    const fetchPromise = (async () => {
      const startedAt = Date.now();
      console.log(`[AUTH:fetchProfile] ▶ start user=${shortId(userId)}`);
      set({ profilePending: true, profileError: false, profileErrorReason: null });

      const finalize = (label: string) => {
        const duration = Date.now() - startedAt;
        console.log(`${label} duration=${duration}ms`);
      };

      const handleFailure = (reason: string) => {
        finalize(`[AUTH:fetchProfile] ⚠ fallback reason=${reason}`);
        const treatAsMissing = reason === 'profile_missing';
        set({
          profile: null,
          profileChecked: treatAsMissing,
          profileError: !treatAsMissing,
          profilePending: false,
          profileErrorReason: treatAsMissing ? null : reason,
        });
        return null;
      };

      try {
        const { data: profile, error: profileErr } = await withTimeout<PostgrestSingleResponse<Profile>>(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          PROFILE_FETCH_TIMEOUT_MS,
          'profiles_timeout',
        );

        if (profileErr) {
          console.warn('[AUTH:fetchProfile] profiles query error', profileErr.message);
          return handleFailure('profiles_query_error');
        }

        if (!profile) {
          console.log('[AUTH:fetchProfile] profile missing, synthesizing fallback');
          return handleFailure('profile_missing');
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

        set({
          profile: hydrated,
          profileChecked: true,
          profileError: false,
          profilePending: false,
          profileErrorReason: null,
        });
        finalize(
          `[AUTH:fetchProfile] ✓ success profile=${shortId(hydrated.id)} photos=${hydrated.photos?.length ?? 0}`,
        );
        return hydrated;
      } catch (err) {
        const message = (err as Error)?.message ?? 'unknown';
        if (message === 'profiles_timeout') {
          console.warn('[AUTH:fetchProfile] profiles query timeout');
          return handleFailure('profiles_timeout');
        }
        console.warn('[AUTH:fetchProfile] unexpected error', message);
        return handleFailure('unexpected_error');
      }
    })();

    profileFetchInFlight.set(userId, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      profileFetchInFlight.delete(userId);
    }
  },

  logout: async () => {
    console.log('[AUTH:logout] ▶ start');
    // 1) Tear down realtime channels immediately
    try { (supabase as any).realtime?.removeAllChannels?.(); } catch {}

    // 2) Clear in-memory auth state immediately for UI
    set({
      session: null,
      profile: null,
      loading: false,
      profileChecked: false,
      profileError: false,
      profilePending: false,
      profileErrorReason: null,
    });

    // 3) Try to sign out locally and globally with timeouts (avoid hangs)
    const withSignOutTimeout = async <T,>(p: Promise<T>, ms = 4000) =>
      Promise.race<T>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), ms)) as any,
      ]);
    try { await withSignOutTimeout(supabase.auth.signOut({ scope: 'local' } as any), 2500); } catch (e) { console.warn('Local signOut failed', e); }
    try { await withSignOutTimeout(supabase.auth.signOut({ scope: 'global' } as any), 4000); } catch (e) { console.warn('Global signOut failed', e); }

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

    console.log('[AUTH:logout] ◀ finish');
  },

  initialize: async () => {
    console.log('[AUTH:init] ▶ start');
    set({ loading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log(`[AUTH:init] session=${shortId(session?.user?.id)}`);
  set({ session, profileChecked: false, profileError: false, profileErrorReason: null });

      if (session?.user) {
        console.log(`[AUTH:init] fetching profile for ${shortId(session.user.id)}`);
        await get().fetchProfile(session.user.id);
      } else {
        console.log('[AUTH:init] no session -> clearing profile state');
        set({
          profile: null,
          profileChecked: false,
          profileError: false,
          profilePending: false,
          profileErrorReason: null,
        });
      }
    } catch (err) {
      console.warn('[AUTH:init] unexpected error', (err as Error)?.message);
      set({
        profile: null,
        profileChecked: false,
        profileError: true,
        profilePending: false,
        profileErrorReason: 'init_error',
      });
    } finally {
      console.log('[AUTH:init] ◀ finish (loading=false)');
      set({ loading: false });
    }
  },
}));
