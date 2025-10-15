import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/Avatar';
import { ChevronRight, User, Image as ImageIcon, Shield, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { profile, logout, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = Math.max(insets.bottom, 24);

  const performLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    let encounteredError: Error | null = null;
    try {
      await logout();
    } catch (error) {
      encounteredError = error as Error;
      console.warn('logout error', encounteredError?.message);
    } finally {
      setLoggingOut(false);
    }

    if (encounteredError) {
      Alert.alert('로그아웃 실패', '세션 종료 중 문제가 발생했어요. 다시 시도해주세요.');
      return;
    }

    // Route to OTP login by default. Password accounts can switch from there.
    router.replace('/auth/login');
  };

  const handleLogout = () => {
    if (loggingOut) return;

    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: performLogout },
    ]);
  };

  const handleOpenDebug = () => {
    router.push('/debug/supabase');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: contentPaddingBottom }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
        <View />
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      )}

      {profile ? (
        <>
          <View style={styles.profileCard}>
            <Avatar
              uri={profile.primaryPhoto?.url}
              name={profile.display_name}
              size="large"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.display_name}</Text>
              <Text style={styles.profileBio}>{profile.bio || '소개가 없습니다'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>프로필</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/profile/edit')}
            >
              <User color="#333" size={20} />
              <Text style={styles.menuText}>프로필 수정</Text>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/profile/photos')}
            >
              <ImageIcon color="#333" size={20} />
              <Text style={styles.menuText}>사진 관리</Text>
              <ChevronRight color="#999" size={20} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        !loading && (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>프로필을 불러오지 못했습니다</Text>
            <Text style={styles.placeholderSubtitle}>
              잠시 후 다시 시도하거나 프로필 설정을 완료해주세요.
            </Text>
          </View>
        )
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>안전</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings/blocked-users')}
        >
          <Shield color="#333" size={20} />
          <Text style={styles.menuText}>차단한 사용자</Text>
          <ChevronRight color="#999" size={20} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <LogOut color="#FF3B30" size={20} />
        <Text style={styles.logoutText}>{loggingOut ? '로그아웃 중...' : '로그아웃'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.debugButton} onPress={handleOpenDebug}>
        <Text style={styles.debugText}>Supabase 디버그 실행</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    color: '#666',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 24,
    marginBottom: 48,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  debugButton: {
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  debugText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 24,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
