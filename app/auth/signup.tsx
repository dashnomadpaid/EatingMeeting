import React, { useMemo, useRef, useState, useEffect } from 'react';
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
import { sendOTP, verifyOTP } from '@/hooks/useAuth';
import { useAuthStore } from '@/state/auth.store';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [needsResend, setNeedsResend] = useState(false);
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const otpRef = useRef<TextInput>(null);
  const { session, logout } = useAuthStore();

  // Clean current session to begin fresh signup flow
  useEffect(() => {
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

  const handleSendOTP = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      Alert.alert('오류', '올바른 이메일을 입력하세요');
      return;
    }
    try {
      setLoading(true);
      const { error } = await sendOTP(normalized);
      if (error) throw error;
      setOtp('');
      setOtpSent(true);
      setSentEmail(normalized);
      setNeedsResend(false);
      Alert.alert('이메일을 확인하세요', '6자리 코드를 보냈습니다.');
      setTimeout(() => otpRef.current?.focus?.(), 100);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '코드 전송에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const VERIFY_TIMEOUT_MS = 15000;

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
      const result = await Promise.race([
        verifyOTP(emailForVerify, code),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT: OTP verification took too long')), VERIFY_TIMEOUT_MS)
        ),
      ]);
      const { error } = (result as { error: Error | null }) ?? { error: null };
      if (error) throw error;
      // Proceed to password setup
      router.replace({ pathname: '/auth/set-password', params: { email: emailForVerify } });
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '코드가 유효하지 않거나 만료되었습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (v: string) => {
    if (otpSent) {
      const target = v.trim().toLowerCase();
      if (sentEmail && target !== sentEmail) {
        setNeedsResend(true);
        if (otp) setOtp('');
      } else if (sentEmail && target === sentEmail) {
        setNeedsResend(false);
      }
    }
    setEmail(v);
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
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>이메일 인증 후 비밀번호를 설정합니다.</Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="user@example.com"
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
              <Text style={styles.link} onPress={() => setOtpSent(false)}>이메일 변경</Text>
            </>
          )}

          <View style={{ height: 16 }} />

          {!otpSent ? (
            <Button title={loading ? '전송 중…' : '코드 보내기'} onPress={handleSendOTP} disabled={loading} />
          ) : (
            <Button title={loading ? '확인 중…' : '인증'} onPress={handleVerify} disabled={loading || needsResend || !otp.trim()} />
          )}

          <View style={{ height: 12 }} />
          <Text
            style={[styles.link, { textAlign: 'center' }]}
            onPress={() => router.replace('/auth/login-password')}
          >
            계정이 있으신가요? 기존 계정으로 로그인
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
  link: { color: '#007aff', fontSize: 14, fontWeight: '500', textAlign: 'right', marginTop: 4 },
});
