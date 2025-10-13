import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import KeyboardInset from '@/components/KeyboardInset';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';

export default function LoginPasswordScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const { session, logout } = useAuthStore();

  // Clean up any existing session to avoid mixed states
  const didCleanupRef = useRef(false);
  useEffect(() => {
    if (didCleanupRef.current) return;
    didCleanupRef.current = true;
    if (session) logout().catch(() => {});
  }, []);

  const Wrapper: any = Platform.OS === 'web' ? React.Fragment : TouchableWithoutFeedback;
  const wrapperProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss, accessible: false };

  const basePadding = 32;
  const contentContainerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [
      styles.container,
      { paddingTop: basePadding + insets.top, paddingBottom: basePadding + insets.bottom },
    ],
    [insets.top, insets.bottom]
  );

  const LOGIN_TIMEOUT_MS = 15000;

  const handleLogin = async () => {
    const normalized = email.trim().toLowerCase();
    const pwd = password.trim();
    if (!normalized || !normalized.includes('@')) {
      Alert.alert('오류', '올바른 이메일을 입력하세요');
      return;
    }
    if (!pwd || pwd.length < 6) {
      Alert.alert('오류', '비밀번호를 6자 이상 입력하세요');
      return;
    }
    try {
      setLoading(true);
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: normalized, password: pwd }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT: 로그인 응답이 지연됩니다. 네트워크를 확인하세요.')), LOGIN_TIMEOUT_MS)
        ),
      ]);
      const { error } = (result as { error: Error | null }) ?? { error: null };
      if (error) throw error;
      router.replace('/');
    } catch (e: any) {
      const msg = e?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다';
      Alert.alert('로그인 실패', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper {...wrapperProps}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <KeyboardInset>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>이메일과 비밀번호로 로그인하세요.</Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="user@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode={Platform.OS === 'web' ? 'email' : undefined}
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus?.()}
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="비밀번호"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <View style={{ height: 16 }} />
          <Button title={loading ? '로그인 중…' : '로그인'} onPress={handleLogin} disabled={loading} />

          <View style={{ height: 8 }} />
          <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.push('/auth/login')}>
            이메일 인증(OTP)으로 로그인
          </Text>
          <View style={{ height: 8 }} />
          <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.push('/auth/signup')}>
            처음이신가요? 이메일 인증으로 회원가입
          </Text>
        </KeyboardInset>
      </ScrollView>
    </Wrapper>
  );
}

type InputTextStyle = Omit<TextStyle, 'outlineStyle'> &
  ViewStyle & {
    outlineStyle?: 'auto' | 'solid' | 'dotted' | 'dashed';
    cursor?: 'text' | 'auto' | 'default';
  };

type Styles = {
  scroll: ViewStyle;
  container: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  label: TextStyle;
  input: InputTextStyle;
  link: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    minHeight: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : null),
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? (({ outlineStyle: 'auto', cursor: 'text' } as unknown) as Partial<InputTextStyle>)
      : null),
  },
  link: { color: '#007aff', fontSize: 14, fontWeight: '500' },
});
