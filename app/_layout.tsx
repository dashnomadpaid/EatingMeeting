import { useEffect, useState } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import KeyboardProviderCompat from '@/components/KeyboardProviderCompat';


export default function RootLayout() {
  useFrameworkReady();
  const { session, profile, loading } = useAuth();

  // Boot safety net: if global loading never resolves, show UI after 6s
  const [bootTimedOut, setBootTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Always render the stack so all routes are registered. Initial routing happens in app/index.tsx

  return (
    <KeyboardProviderCompat>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/login-password" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/set-password" />
        <Stack.Screen name="auth/onboarding" />
        <Stack.Screen name="chat/new" />
        <Stack.Screen name="chat/thread/[id]" />
        <Stack.Screen name="place/[id]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/photos" />
        <Stack.Screen name="settings/blocked-users" />
      </Stack>
    </KeyboardProviderCompat>
  );
    
  
}
