import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

// Ensure we only bootstrap auth once across multiple hook consumers
let didBootstrap = false;
let didSubscribe = false;

export function useAuth() {
  const {
    session,
    profile,
    loading,
    setSession,
    setProfile,
    logout,
    initialize,
    profileChecked,
    profileError,
    fetchProfile,
    profilePending,
    profileErrorReason,
  } = useAuthStore() as any;
  const profileRetryRef = useRef(false);

  useEffect(() => {
    if (!didBootstrap) {
      didBootstrap = true;
      console.log('[AUTH:hook] bootstrap initialize()');
      initialize();
    }

    if (!didSubscribe) {
      didSubscribe = true;
      console.log('[AUTH:hook] subscribing to auth state changes');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(
          `[AUTH:onAuthStateChange] event=${event} session=${
            session?.user?.id ? session.user.id.slice(0, 6) + '…' : 'none'
          }`,
        );
        setSession(session);

        const shouldHydrate =
          session?.user &&
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED');

        if (shouldHydrate) {
          console.log(`[AUTH:onAuthStateChange] hydrate profile for ${session.user.id}`);
          try {
            await fetchProfile(session!.user.id);
          } catch (err) {
            console.warn('[AUTH:onAuthStateChange] hydrate error', (err as Error)?.message);
          }
        } else if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('[AUTH:onAuthStateChange] clearing profile (signed out)');
          setProfile(null);
          useAuthStore.setState({
            profileChecked: false,
            profileError: false,
            profilePending: false,
            profileErrorReason: null,
          });
        }
      });
      // Note: do not unsubscribe here to avoid tearing down global listener
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      profileRetryRef.current = false;
      return;
    }
    if (!loading && !profile && !profileChecked && !profilePending) {
      console.log(
        `[AUTH:autoFetchProfile] triggering fetch (profile missing) user=${
          session.user.id.slice(0, 6) + '…'
        }`,
      );
      fetchProfile(session.user.id).catch((err: Error) => {
        console.warn('[AUTH:autoFetchProfile] hydrate error', err?.message);
      });
    }
  }, [session?.user?.id, loading, profile, profileChecked, fetchProfile, profilePending]);

  useEffect(() => {
    if (!session?.user) {
      profileRetryRef.current = false;
      return;
    }
    if (!loading && profileError && !profileRetryRef.current && !profilePending) {
      console.log(
        `[AUTH:retryFetchProfile] retrying profile fetch user=${
          session.user.id?.slice(0, 6) + '…'
        }`,
      );
      profileRetryRef.current = true;
      fetchProfile(session.user.id).catch((err: Error) => {
        console.warn('[AUTH:retryFetchProfile] hydrate error', err?.message);
      });
    }
  }, [session?.user?.id, loading, profileError, fetchProfile, profilePending]);

  useEffect(() => {
    if (!profileError) {
      profileRetryRef.current = false;
    }
  }, [profileError]);

  return {
    session,
    profile,
    loading,
    logout,
    profileChecked,
    profileError,
    profilePending,
    profileErrorReason,
    fetchProfile,
  };
}

export function useRequireAuth() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth/login');
    }
  }, [session, loading]);

  return { session, loading };
}

export async function sendOTP(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function verifyOTP(email: string, token: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
