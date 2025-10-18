import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useUserCards, createOrOpenDM, USE_MOCK_DATA } from '@/hooks/useCommunity';
import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/Tag';
import { formatDistance } from '@/lib/geo';
import { Profile } from '@/types/models';

export default function CommunityScreen() {
  const { users, loading } = useUserCards();

  const handleStartChat = async (user: Profile) => {
    // 🎭 목업 모드 체크
    if (USE_MOCK_DATA) {
      Alert.alert(
        '목업 모드',
        '실제 채팅 기능은 나중에 구현됩니다!\n\n' + `선택한 사용자: ${user.display_name}`,
        [{ text: '확인', style: 'default' }]
      );
      return;
    }

    // 🔴 실제 채팅 시작
    const threadId = await createOrOpenDM(user.id);
    if (threadId) {
      router.push(`/chat/thread/${threadId}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>밥친구</Text>
        <View />
      </View>

      {USE_MOCK_DATA && (
        <View style={styles.mockBadge}>
          <Text style={styles.mockText}>🎭 목업 데이터 (개발용)</Text>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Avatar uri={item.primaryPhoto?.url} name={item.display_name} size="large" />
              <View style={styles.info}>
                <Text style={styles.name}>{item.display_name}</Text>
                {item.distance !== undefined && (
                  <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
                )}
                <Text style={styles.bio} numberOfLines={2}>
                  {item.bio || '소개가 아직 없습니다'}
                </Text>
              </View>
            </View>

            <View style={styles.tags}>
              {item.diet_tags?.slice(0, 3).map((tag) => (
                <Tag key={tag} label={tag} type="diet" />
              ))}
              <Tag label={item.budget_range} type="budget" />
            </View>

            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => handleStartChat(item)}
            >
              <Text style={styles.chatButtonText}>채팅 시작</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loading ? '불러오는 중...' : '주변에 밥친구들이 없습니다'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  list: {
    padding: 16,
  },
  mockBadge: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  mockText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  distance: {
    fontSize: 14,
    color: '#FF6B35',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chatButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
