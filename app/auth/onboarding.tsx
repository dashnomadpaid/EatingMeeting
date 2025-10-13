import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, Platform, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import KeyboardInset from '@/components/KeyboardInset';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Profile } from '@/types/models';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const { session, setProfile } = useAuthStore();
  const [step, setStep] = useState(2);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const displayNameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const basePadding = 32;
  const backButtonHeight = 36;
  const averagePadding =
    basePadding + (insets.top + insets.bottom + backButtonHeight) / 2;
  const contentContainerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [
      styles.content,
      {
        paddingTop: averagePadding,
        paddingBottom: averagePadding,
      },
    ],
    [averagePadding],
  );

  // Animated inset handled by KeyboardInset wrapper to avoid import-time crashes

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!isMounted) return;
        if (status === 'granted') {
          setStep(3);
        }
      } catch (error) {
        console.warn('Failed to check location permission status', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLocationPermission = async () => {
    setLocationLoading(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === 'granted') {
        setStep(3);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setStep(3);
      } else {
        Alert.alert('위치 권한이 필요합니다', '주변 밥친구를 보여드리려면 위치 권한이 필요합니다.');
      }
    } catch (error) {
      console.warn('Failed to request location permission', error);
      Alert.alert('권한 요청 실패', '위치 권한을 요청하는 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleComplete = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      if (!displayName.trim()) {
        Alert.alert('오류', '닉네임을 입력해주세요.');
        return;
      }

      const userId = session?.user?.id;
      if (!userId) {
        Alert.alert('오류', '다시 로그인해주세요.');
        return;
      }

      const payload = {
        id: userId,
        display_name: displayName,
        bio,
      };

      console.log('[ONBOARDING] payload=', payload);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      console.log('[ONBOARDING] result=', { data, error });

      if (error) {
        Alert.alert('저장할 수 없습니다', error.message || '프로필 저장에 실패했습니다.');
        return;
      }

      if (!data) {
        Alert.alert('저장할 수 없습니다', '프로필 저장에 실패했습니다.');
        return;
      }

      const nextProfile = {
        ...data,
        photos: [],
        primaryPhoto: undefined,
      } as Profile;

      setProfile(nextProfile);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('온보딩 저장에 실패했습니다', error);
      Alert.alert('저장할 수 없습니다', (error as Error)?.message ?? '프로필 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader
        mode="overlay"
        backAlwaysVisible
        backFallbackHref="/auth/login-password"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {step === 2 && (
          <KeyboardInset>
            <Text style={styles.title}>이팅미팅에 오신 것을 환영합니다!</Text>
            <Text style={styles.description}>
              주변 맛집과 밥친구를 보여드리기 위해 위치 정보가 필요합니다. 개인정보 보호를 위해 대략적인 거리만 표시됩니다.
            </Text>
            <Button title="위치 허용" onPress={handleLocationPermission} loading={locationLoading} disabled={locationLoading} />
          </KeyboardInset>
        )}

        {step === 3 && (
          <KeyboardInset>
            <Text style={styles.title}>프로필 만들기</Text>
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => bioRef.current?.focus?.()}
              autoComplete="name"
              ref={displayNameRef}
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="음식 취향을 알려주세요 (선택)"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={200}
              ref={bioRef}
              autoComplete="off"
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
            <Button title="시작하기" onPress={handleComplete} loading={loading} />
          </KeyboardInset>
        )}
      </ScrollView>
    </View>
  );
}

type Styles = {
  wrapper: ViewStyle;
  container: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  description: TextStyle;
  input: TextStyle & ViewStyle;
  bioInput: TextStyle & ViewStyle;
  charCount: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    minHeight: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : null),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
  },
});
