import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useMapStore } from '@/state/map.store';
import { BackButton } from '@/components/BackButton';
import { FilledStar } from '@/components/FilledStar';
import { OverlappingAvatars } from '@/components/OverlappingAvatars';
import type { Place as GooglePlace } from '@/services/places.google';
import type { Profile } from '@/types/models';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🎭 Mock 프로필 데이터 (관심있는 사람들)
const MOCK_INTERESTED_PROFILES: Profile[] = [
  {
    id: 'mock-interest-1',
    display_name: '김철수',
    bio: '맛집 탐방 좋아해요',
    diet_tags: ['한식'],
    budget_range: '1만원-2만원',
    time_slots: ['평일 저녁'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhoto: {
      id: 'mock-photo-1',
      user_id: 'mock-interest-1',
      url: 'https://i.pravatar.cc/150?img=12',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-interest-2',
    display_name: '이영희',
    bio: '새로운 음식 도전!',
    diet_tags: ['양식'],
    budget_range: '2만원-3만원',
    time_slots: ['주말 점심'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhoto: {
      id: 'mock-photo-2',
      user_id: 'mock-interest-2',
      url: 'https://i.pravatar.cc/150?img=45',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-interest-3',
    display_name: '정수연',
    bio: '맛있는 거 먹으러 가요',
    diet_tags: ['중식'],
    budget_range: '1만원-2만원',
    time_slots: ['평일 점심'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhoto: {
      id: 'mock-photo-3',
      user_id: 'mock-interest-3',
      url: 'https://i.pravatar.cc/150?img=23',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'mock-interest-4',
    display_name: '박민수',
    bio: '식도락 여행중',
    diet_tags: ['일식'],
    budget_range: '3만원-5만원',
    time_slots: ['주말 저녁'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhoto: {
      id: 'mock-photo-4',
      user_id: 'mock-interest-4',
      url: 'https://i.pravatar.cc/150?img=33',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
];

// 별도 컴포넌트로 분리 (Hooks 규칙 준수)
interface RestaurantCardProps {
  item: GooglePlace;
  isExpanded: boolean;
  onPress: (item: GooglePlace) => void;
  onToggleExpand: (placeId: string) => void;
}

function RestaurantCard({ item, isExpanded, onPress, onToggleExpand }: RestaurantCardProps) {
  // Mock 데이터 사용 (실제 API 연동 전까지)
  const interestedPeople = MOCK_INTERESTED_PROFILES.slice(0, Math.floor(Math.random() * 5));
  
  return (
    <TouchableOpacity
      style={styles.listItemWrapper}
      onPress={() => onPress(item)}
      activeOpacity={0.95}
    >
      {/* 기본 카드 정보 */}
      <View style={styles.listItem}>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.address && (
            <Text style={styles.listItemAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
        </View>
        <View style={styles.rightSection}>
          {item.rating !== undefined && (
            <FilledStar rating={item.rating} size={22} />
          )}
          {/* 더보기 버튼 */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleExpand(item.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View
              style={{
                transform: [{
                  rotate: isExpanded ? '180deg' : '0deg'
                }]
              }}
            >
              <ChevronDown size={18} color="#999999" strokeWidth={2} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 확장 영역 - 식당 정보 및 모임 참여자 */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* 간략한 식당 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>카테고리</Text>
            <Text style={styles.infoValue}>
              {item.types?.[0] || '정보 없음'}
            </Text>
          </View>
          
          {item.userRatingsTotal && (
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>리뷰 수</Text>
              <Text style={styles.infoValue}>
                {item.userRatingsTotal.toLocaleString()}개
              </Text>
            </View>
          )}
          
          {/* 모임 참여자 */}
          <View style={styles.participantsSection}>
            <Text style={styles.participantsLabel}>
              이 장소에 관심있는 사람들
            </Text>
            {interestedPeople.length > 0 ? (
              <OverlappingAvatars 
                participants={interestedPeople} 
                maxVisible={3}
                size={36}
              />
            ) : (
              <Text style={styles.participantsEmpty}>
                아직 관심있는 사람이 없어요
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MapListScreen() {
  const insets = useSafeAreaInsets();
  const places = useMapStore((state) => state.googlePlaces);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleItemPress = (item: GooglePlace) => {
    setSelectedGooglePlace(item);
    router.back();
  };
  
  const toggleExpand = (placeId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === placeId ? null : placeId);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton alwaysShow onPress={() => router.back()} />
        <Text style={styles.title}>주변 식당 목록</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => (
          <RestaurantCard
            item={item}
            isExpanded={expandedId === item.id}
            onPress={handleItemPress}
            onToggleExpand={toggleExpand}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>주변 식당을 찾지 못했습니다</Text>
          </View>
        }
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  listItemAddress: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  listItemWrapper: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandButton: {
    padding: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  participantsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  participantsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  participantsEmpty: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
});
