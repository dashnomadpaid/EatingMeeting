import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/state/auth.store';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function EditProfileScreen() {
  const { profile, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    if (!displayName.trim()) {
      Alert.alert('오류', '닉네임을 입력해주세요.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      Alert.alert('오류', '프로필 저장에 실패했습니다.');
    } else if (data) {
      setProfile(data);
      Alert.alert('성공', '프로필이 저장되었습니다.');
      router.back();
    }
    setLoading(false);
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="프로필 수정" />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>닉네임</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
        />

        <Text style={styles.label}>소개</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={200}
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>

        <Button title="저장" onPress={handleSave} loading={loading} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
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
