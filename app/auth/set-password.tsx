import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Keyboard, Platform, TouchableWithoutFeedback, ScrollView, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import KeyboardInset from '@/components/KeyboardInset';
import { supabase } from '@/lib/supabase';

export default function SetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const confirmRef = useRef<TextInput>(null);

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

  const handleSetPassword = async () => {
    const pwd = password.trim();
    const cf = confirm.trim();
    if (pwd.length < 6) {
      Alert.alert('오류', '비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (pwd !== cf) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      Alert.alert('완료', '비밀번호가 설정되었습니다');
      router.replace('/auth/onboarding');
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '비밀번호 설정에 실패했습니다');
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
          <Text style={styles.title}>비밀번호 설정</Text>
          {email ? <Text style={styles.subtitle}>{email}</Text> : null}

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus?.()}
          />

          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            ref={confirmRef}
            style={styles.input}
            placeholder="비밀번호 확인"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={handleSetPassword}
          />

          <View style={{ height: 16 }} />
          <Button title={loading ? '설정 중…' : '설정 완료'} onPress={handleSetPassword} disabled={loading} />
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
});

