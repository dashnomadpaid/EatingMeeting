import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { router } from 'expo-router';
import { useUserCards, createOrOpenDM } from '@/hooks/useCommunity';
import { useCommunityStore } from '@/state/community.store';
import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/Tag';
import { formatDistance } from '@/lib/geo';
import { Profile } from '@/types/models';

export default function CommunityScreen() {
  const { users, loading } = useUserCards();
  const { useMockData, setUseMockData } = useCommunityStore();

  const handleStartChat = async (user: Profile) => {
    // 🎭 목업 모드 체크
    if (useMockData) {
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

  const toggleMockMode = () => {
    setUseMockData(!useMockData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>밥친구</Text>
        <TouchableOpacity 
          style={[styles.toggleButton, useMockData && styles.toggleButtonActive]}
          onPress={toggleMockMode}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleDot, useMockData && styles.toggleDotActive]} />
          <Text style={[styles.toggleText, useMockData && styles.toggleTextActive]}>
            {useMockData ? 'MOCK' : 'LIVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {useMockData && (
        <View style={styles.mockBadge}>
          <View style={styles.mockDot} />
          <Text style={styles.mockText}>목업 모드</Text>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleStartChat(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              {/* 왼쪽: Avatar + 정보 */}
              <View style={styles.leftSection}>
                <Avatar 
                  source={typeof item.primaryPhoto?.url === 'number' ? item.primaryPhoto.url : undefined}
                  uri={typeof item.primaryPhoto?.url === 'string' ? item.primaryPhoto.url : undefined}
                  name={item.display_name} 
                  size="medium" 
                />
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    {item.distance !== undefined && (
                      <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
                    )}
                  </View>
                  <View style={styles.tags}>
                    {item.diet_tags?.slice(0, 2).map((tag) => (
                      <Text key={tag} style={styles.tag}>
                        {tag}
                      </Text>
                    ))}
                    <Text style={styles.budgetTag}>{item.budget_range}</Text>
                  </View>
                </View>
              </View>

              {/* 오른쪽: 화살표 아이콘 */}
              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
  },
  toggleDotActive: {
    backgroundColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: '#FF6B35',
  },
  list: {
    padding: 16,
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  mockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginRight: 6,
  },
  mockText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  distance: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  budgetTag: {
    fontSize: 12,
    color: '#FF6B35',
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '500',
  },
  arrowIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
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
