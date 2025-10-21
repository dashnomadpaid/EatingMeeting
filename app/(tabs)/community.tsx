import { useEffect, useRef, useState } from 'react';
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
  
  // 카드 애니메이션 관리
  const [animatedUsers, setAnimatedUsers] = useState<Profile[]>([]);
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const previousMockMode = useRef<boolean>(useMockData);
  const isAnimating = useRef<boolean>(false);
  const currentAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // 카드 애니메이션 값 가져오기 또는 생성
  const getCardAnimation = (userId: string) => {
    if (!cardAnimations.current.has(userId)) {
      cardAnimations.current.set(userId, new Animated.Value(0));
    }
    return cardAnimations.current.get(userId)!;
  };

  // 진행 중인 모든 애니메이션 중단
  const stopAllAnimations = () => {
    currentAnimations.current.forEach(anim => anim.stop());
    currentAnimations.current = [];
    isAnimating.current = false;
  };

  // 모드 변경 즉시 감지 및 데이터 동기화 (애니메이션보다 우선)
  useEffect(() => {
    const modeChanged = previousMockMode.current !== useMockData;
    
    if (modeChanged) {
      previousMockMode.current = useMockData;
      
      // 모드가 바뀌면 즉시 기존 데이터 제거 (잘못된 데이터 표시 방지)
      stopAllAnimations();
      cardAnimations.current.clear();
      setAnimatedUsers([]); // 화면 즉시 비우기
    }
  }, [useMockData]);

  // 통합된 애니메이션 로직 (users 데이터가 준비되면 페이드인)
  useEffect(() => {
    // 로딩 중이거나 애니메이션 진행중이면 대기
    if (loading || isAnimating.current) {
      return;
    }

    // users가 없으면 대기 (빈 배열은 ListEmptyComponent가 처리)
    if (users.length === 0) {
      return;
    }

    // animatedUsers가 비어있으면 새 데이터 페이드인 시작
    if (animatedUsers.length === 0) {
      isAnimating.current = true;
      setAnimatedUsers(users);
      
      const fadeInAnimations = users.map((user, index) => {
        const animation = getCardAnimation(user.id);
        animation.setValue(0);
        
        return Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          delay: index * 60,
          useNativeDriver: true,
        });
      });

      const fadeInComposite = Animated.stagger(0, fadeInAnimations);
      currentAnimations.current = [fadeInComposite];
      
      fadeInComposite.start(({ finished }) => {
        if (finished) {
          isAnimating.current = false;
          currentAnimations.current = [];
        }
      });
    }
  }, [users, loading]);

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

      <FlatList
        data={animatedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // 🔒 철벽 모드 검증: MOCK 데이터인지 체크
          const isMockUser = item.id.startsWith('mock-');
          
          // LIVE 모드인데 MOCK 데이터면 렌더링 즉시 차단
          if (!useMockData && isMockUser) {
            return null;
          }
          
          // MOCK 모드인데 실제 데이터면 렌더링 즉시 차단
          if (useMockData && !isMockUser) {
            return null;
          }
          
          const animation = getCardAnimation(item.id);
          
          return (
            <Animated.View
              style={{
                opacity: animation,
                transform: [
                  {
                    translateX: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0], // 좌에서 우로 슬라이드
                    }),
                  },
                ],
              }}
            >
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
        </Animated.View>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loading || isAnimating.current || (animatedUsers.length === 0 && users.length > 0) 
                ? '불러오는 중...' 
                : '주변에 밥친구들이 없습니다'}
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
