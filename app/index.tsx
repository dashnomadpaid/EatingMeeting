import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Gate() {
  const { session, profile, loading, profileChecked, profileError } = useAuth();
  useEffect(() => {
    const sessionId = session?.user?.id ?? null;
    const profileId = (profile as any)?.id ?? null;
    console.log(
      `[GATE] loading=${loading ? 'yes' : 'no'} session=${sessionId ?? 'none'} profile=${profileId ?? 'none'}`,
    );
  }, [loading, session?.user?.id, (profile as any)?.id]);

  // Always wait for loading to finish before deciding the route,
  // to avoid misrouting (e.g., redirecting to onboarding before profile loads).
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login-password" />;
  }
  // If session exists but profile is not yet determined (not checked), optimistically go to tabs
  if (session && !profile) {
    if (!profileChecked || profileError) {
      // Optimistically go to tabs; profile will hydrate later
      return <Redirect href="/(tabs)" />;
    }
    // Definitively no profile
    return <Redirect href="/auth/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
