import React, { useMemo, useRef, useState } from 'react';
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
import { sendOTP, verifyOTP } from '@/hooks/useAuth';
import KeyboardInset from '@/components/KeyboardInset';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [needsResend, setNeedsResend] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { session, logout, setProfile } = useAuthStore() as any;
  const handleOpenDebug = React.useCallback(() => {
    router.push('/debug');
  }, []);

  // Ensure clean state when entering login screen
  const didCleanupRef = useRef(false);
  React.useEffect(() => {
    if (didCleanupRef.current) return;
    didCleanupRef.current = true;
    if (session) {
      console.log(
        `[LOGIN] existing session detected (${session.user?.id?.slice(0, 6) ?? 'none'}) -> logout()`,
      );
      logout().catch((error: unknown) => {
        console.warn('[LOGIN] logout during mount failed', (error as Error)?.message);
      });
    } else {
      console.log('[LOGIN] no existing session on login mount');
    }
  }, []);

  const Wrapper: any = Platform.OS === 'web' ? React.Fragment : TouchableWithoutFeedback;
  const wrapperProps = Platform.OS === 'web' ? {} : { onPress: Keyboard.dismiss, accessible: false };

  const basePadding = 32;
  const contentContainerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [
      styles.container,
      {
        paddingTop: basePadding + insets.top,
        paddingBottom: basePadding + insets.bottom,
      },
    ],
    [insets.top, insets.bottom],
  );

  const handleSendOTP = async () => {
    if (loading) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      Alert.alert('오류', '올바른 이메일을 입력하세요');
      return;
    }
    try {
      setLoading(true);
      console.log('[LOGIN] send OTP request', { email: normalized });
      const { error } = await sendOTP(normalized);
      if (error) throw error;
  console.log('[LOGIN] OTP sent successfully');
      setOtp('');
      setOtpSent(true);
      setSentEmail(normalized);
      setNeedsResend(false);
      Alert.alert('이메일을 확인하세요', '6자리 코드를 보냈습니다.');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '코드 전송에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // timeouts for verify and profile hydration
  const VERIFY_TIMEOUT_MS = 15000;
  const HYDRATE_TIMEOUT_MS = 4000;

  const handleVerify = async () => {
    if (needsResend) {
      Alert.alert('알림', '이메일이 변경되었습니다. 새 코드 전송 후 인증하세요.');
      return;
    }
    const code = (otp || '').trim().replace(/\D/g, '');
    if (!code || code.length !== 6) {
      Alert.alert('오류', '이메일로 받은 6자리 코드를 입력하세요');
      return;
    }
    try {
      setLoading(true);
      const emailForVerify = (sentEmail || email).trim().toLowerCase();
      console.log('[LOGIN] verifying OTP', { email: emailForVerify, code });
      const result = await Promise.race([
        verifyOTP(emailForVerify, code),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT: OTP verification took too long')), VERIFY_TIMEOUT_MS)
        ),
      ]);
      const { error } = (result as { error: Error | null }) ?? { error: null };
      if (error) throw error;
  console.log('[LOGIN] OTP verify succeeded');

      // Proactively load profile to avoid brief onboarding redirect
      try {
        await Promise.race([
          (async () => {
            const { data: userRes } = await supabase.auth.getUser();
            const userId = userRes?.user?.id;
            if (userId) {
              console.log('[LOGIN] hydrate profile before gate', { userId: userId.slice(0, 6) + '…' });
              const { data: prof } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              if (prof) {
                const { data: photos } = await supabase
                  .from('photos')
                  .select('*')
                  .eq('user_id', prof.id)
                  .order('is_primary', { ascending: false });
                setProfile({
                  ...prof,
                  photos: photos || [],
                  primaryPhoto: photos?.find((p: any) => p.is_primary) || photos?.[0],
                });
                console.log('[LOGIN] profile hydrated -> replace /(tabs)');
                router.replace('/(tabs)');
                return;
              }
            }
            // If profile not found, fall back to gate
            console.log('[LOGIN] profile missing after OTP -> return to gate for onboarding');
            router.replace('/');
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('HYDRATE_TIMEOUT')), HYDRATE_TIMEOUT_MS)
          ),
        ]);
      } catch (e) {
        // On hydration timeout or error, let gate decide immediately
        router.replace('/');
      }
    } catch (e: any) {
      const msg = e?.message ?? '코드가 유효하지 않거나 만료되었습니다';
      console.warn('[LOGIN] verify failed', msg);
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    if (otpSent) {
      if (sentEmail && value !== sentEmail) {
        setNeedsResend(true);
        console.log('[LOGIN] email changed -> require resend', { previous: sentEmail, next: value });
        if (otp) setOtp('');
      } else if (sentEmail && value === sentEmail) {
        setNeedsResend(false);
        console.log('[LOGIN] email reverted -> resend not required');
      }
    }
    setEmail(value);
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
          <Text style={styles.title}>환영합니다</Text>
          <Text style={styles.subtitle}>이메일 주소를 입력하면 로그인 코드가 발송됩니다.</Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="사용자@example.com"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode={Platform.OS === 'web' ? 'email' : undefined}
            textContentType="emailAddress"
            returnKeyType={otpSent ? 'done' : 'send'}
            onSubmitEditing={handleSendOTP}
          />

          {otpSent && (
            <>
              <Text style={styles.label}>인증 코드</Text>
              <TextInput
                ref={otpRef}
                style={styles.input}
                placeholder="6자리 코드를 입력하세요"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                inputMode={Platform.OS === 'web' ? 'numeric' : undefined}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
              />
              <Text
                style={styles.changeEmail}
                onPress={() => {
                  setOtpSent(false);
                  setNeedsResend(false);
                  setSentEmail(null);
                  setOtp('');
                }}
              >
                이메일 변경
              </Text>
            </>
          )}

          <View style={{ height: 16 }} />

          {!otpSent ? (
            <Button title={loading ? '전송 중…' : '코드 보내기'} onPress={handleSendOTP} disabled={loading} />
          ) : (
            <Button
              title={loading ? '확인 중…' : '인증'}
              onPress={handleVerify}
              disabled={loading || needsResend || !otp.trim()}
            />
          )}

          {otpSent && (
            <View style={styles.resendContainer}>
              <View style={styles.noticeWrapper}>
                <Text style={[styles.notice, !needsResend && styles.noticeHidden]}>
                  이메일이 변경되어 기존 코드가 무효합니다. 코드를 다시 보내세요.
                </Text>
              </View>
              <Text style={styles.resend} onPress={handleSendOTP}>
                코드 재전송
              </Text>
            </View>
          )}

          <View style={{ height: 12 }} />
          <Text
            style={[styles.link, { textAlign: 'center' }]}
            onPress={() => router.push('/auth/login-password')}
          >
            비밀번호로 로그인
          </Text>

          <Text
            style={[styles.link, styles.debugLink]}
            onPress={handleOpenDebug}
          >
            Supabase 디버그 화면 열기
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
  changeEmail: TextStyle;
  resendContainer: ViewStyle;
  noticeWrapper: ViewStyle;
  notice: TextStyle;
  noticeHidden: TextStyle;
  resend: TextStyle;
  link: TextStyle;
  debugLink: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    minHeight: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : null),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
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
  changeEmail: {
    textAlign: 'right',
    color: '#007aff',
    marginTop: 4,
    marginBottom: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  noticeWrapper: {
    minHeight: 28,
    justifyContent: 'center',
  },
  notice: {
    textAlign: 'center',
    color: '#CC8A00',
    marginTop: 8,
    fontSize: 12,
  },
  noticeHidden: {
    opacity: 0,
  },
  resend: {
    marginTop: 12,
    color: '#007aff',
    fontSize: 14,
    fontWeight: '500',
  },
  link: { color: '#007aff', fontSize: 14, fontWeight: '500' },
  debugLink: {
    marginTop: 12,
    textAlign: 'center',
    color: '#34d399',
  },
});
