import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useMapStore } from '@/state/map.store';
import { BackButton } from '@/components/BackButton';
import { FilledStar } from '@/components/FilledStar';
import { OverlappingAvatars } from '@/components/OverlappingAvatars';
import { usePlaceParticipants } from '@/hooks/usePlaceParticipants';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MapListScreen() {
  const insets = useSafeAreaInsets();
  const places = useMapStore((state) => state.googlePlaces);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleItemPress = (item: any) => {
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
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const { participants, loading: participantsLoading } = usePlaceParticipants(item.id);
          
          return (
            <View style={styles.listItemWrapper}>
              {/* 기본 카드 - 클릭 시 장소 선택 후 지도로 이동 */}
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
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
                    <View style={styles.ratingContainer}>
                      <FilledStar rating={item.rating} size={24} />
                    </View>
                  )}
                  {/* 아코디언 확장 버튼 */}
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={(e) => {
                      e.stopPropagation(); // 부모 onPress 방지
                      toggleExpand(item.id);
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
                      <ChevronDown size={20} color="#666666" />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              
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
                    {participantsLoading ? (
                      <Text style={styles.participantsEmpty}>불러오는 중...</Text>
                    ) : participants.length > 0 ? (
                      <OverlappingAvatars 
                        participants={participants.map(p => p.profile)} 
                        maxVisible={3}
                        size={32}
                      />
                    ) : (
                      <Text style={styles.participantsEmpty}>
                        아직 관심있는 사람이 없어요
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        }}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
  ratingContainer: {
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
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
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
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
