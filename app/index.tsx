import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Gate() {
  const { session, profile, loading, profileChecked, profileError } = useAuth();
  useEffect(() => {
    const sessionId = session?.user?.id ?? null;
    const profileId = (profile as any)?.id ?? null;
    const shortSession = sessionId ? `${sessionId.slice(0, 6)}…` : 'none';
    const shortProfile = profileId ? `${profileId.slice(0, 6)}…` : 'none';
    const icon = loading ? '⏳' : sessionId ? '✅' : '🚪';
    console.log(`GATE ${icon} load=${loading ? 'on' : 'off'} session=${shortSession} profile=${shortProfile}`);
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
    // Default to OTP login; password users can navigate to password screen.
    return <Redirect href="/auth/login" />;
  }
  // If session exists but no profile, go to onboarding to create one.
  if (session && !profile) {
    return <Redirect href="/auth/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
