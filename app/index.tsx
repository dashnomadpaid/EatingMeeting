import React, { useCallback, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/Button';

export default function Gate() {
  const {
    session,
    profile,
    loading,
    profileChecked,
    profileError,
    profilePending,
    profileErrorReason,
    fetchProfile,
    logout,
  } = useAuth();
  useEffect(() => {
    const sessionId = session?.user?.id ?? null;
    const profileId = (profile as any)?.id ?? null;
    const shortSession = sessionId ? `${sessionId.slice(0, 6)}…` : 'none';
    const shortProfile = profileId ? `${profileId.slice(0, 6)}…` : 'none';
    const icon = loading ? '⏳' : sessionId ? '✅' : '🚪';
    console.log(`GATE ${icon} load=${loading ? 'on' : 'off'} session=${shortSession} profile=${shortProfile}`);
  }, [loading, session?.user?.id, (profile as any)?.id]);

  const errorMessage = useMemo(() => {
    switch (profileErrorReason) {
      case 'profiles_timeout':
        return '프로필 정보를 불러오는데 시간이 오래 걸리고 있어요. 네트워크 상태를 확인한 뒤 다시 시도해주세요.';
      case 'profiles_query_error':
        return '프로필 정보를 불러오는 중 오류가 발생했어요.';
      case 'unexpected_error':
        return '알 수 없는 오류로 프로필 정보를 불러오지 못했어요.';
      case 'init_error':
        return '초기화 중 문제가 발생했어요. 다시 시도해주세요.';
      default:
        return '프로필 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.';
    }
  }, [profileErrorReason]);

  const handleRetry = useCallback(() => {
    if (profilePending) return;
    const userId = session?.user?.id;
    if (!userId) return;
    fetchProfile(userId).catch((err: Error) => {
      console.warn('[GATE] retry fetchProfile error', err?.message);
    });
  }, [fetchProfile, profilePending, session?.user?.id]);

  // Always wait for loading to finish before deciding the route,
  // to avoid misrouting (e.g., redirecting to onboarding before profile loads).
  if (loading) {
    console.log('[GATE] ⏳ still loading -> stay on splash');
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!session) {
    console.log('[GATE] 🚪 no session -> /auth/login');
    // Default to OTP login; password users can navigate to password screen.
    return <Redirect href="/auth/login" />;
  }
  // If session exists but no profile, go to onboarding to create one.
  if (session && !profile) {
    if (profileError) {
      console.log('[GATE] ❗ profile load error -> show retry UI');
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>프로필을 불러오지 못했어요.</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <View style={styles.errorButtons}>
            <Button title="다시 시도" onPress={handleRetry} disabled={profilePending} />
            <View style={{ height: 12 }} />
            <Button title="로그아웃" variant="outline" onPress={logout} />
          </View>
        </View>
      );
    }

    if (profilePending || !profileChecked) {
      console.log('[GATE] ⏳ session present but profile pending -> stay on splash');
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      );
    }
    const profileStatus = profileChecked ? 'checked' : 'pending';
    console.log(
      `[GATE] 🧑‍🎓 session=${session.user?.id?.slice(0, 6) ?? 'none'} profile=${profileStatus} -> /auth/onboarding`,
    );
    return <Redirect href="/auth/onboarding" />;
  }
  console.log('[GATE] ✅ session + profile ready -> /(tabs)');
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111111',
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: 15,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorButtons: {
    alignItems: 'stretch',
  },
});
