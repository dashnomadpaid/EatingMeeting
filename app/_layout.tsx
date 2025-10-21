import { useEffect, useState, useMemo } from 'react';
import { Stack, Redirect, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import KeyboardProviderCompat from '@/components/KeyboardProviderCompat';
import { useMapStore } from '@/state/map.store';

// 🎨 Context-aware StatusBar configuration
// Routes with dark backgrounds → light status bar (white text/icons)
// Routes with light backgrounds → dark status bar (black text/icons)
const DARK_BACKGROUND_ROUTES = [
  '/debug', // Debug control center with dark background
  // Note: Map tab uses DYNAMIC StatusBar based on map theme (day/night cycle)
  // See mapTheme detection in app/(tabs)/index.tsx
];

export default function RootLayout() {
  const frameworkReady = useFrameworkReady();
  const { session, profile, loading, profileChecked } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const [initializing, setInitializing] = useState(true);
  const mapTheme = useMapStore((state) => state.mapTheme); // Get current map theme

  // Boot safety net: if global loading never resolves, show UI after 6s
  const [bootTimedOut, setBootTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // 🎨 Dynamic StatusBar style based on current route and map theme
  const statusBarStyle = useMemo(() => {
    // Special handling for map screen (discover tab): StatusBar adapts to map theme
    // iOS Apple Maps and Android/Web Google Maps auto-adjust light/dark based on time/system
    // Check pathname for '/(tabs)' or just '/' when on the first tab (map)
    const isMapScreen = pathname === '/(tabs)' || pathname === '/' || 
                       (segments?.[0] === '(tabs)' && !segments[1]);
    
    if (isMapScreen) {
      // light map (day) → dark StatusBar (black text)
      // dark map (night) → light StatusBar (white text)
      return mapTheme === 'dark' ? 'light' : 'dark';
    }

    // Other routes: check if they have dark backgrounds
    const currentPath = pathname || '';
    const isDarkBackground = DARK_BACKGROUND_ROUTES.some(route => currentPath.startsWith(route));
    return isDarkBackground ? 'light' : 'dark';
  }, [pathname, segments, mapTheme]);

  // Always render the stack so all routes are registered. Initial routing happens in app/index.tsx

  return (
    <KeyboardProviderCompat>
      <StatusBar style={statusBarStyle} />
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
