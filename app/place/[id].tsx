import { useMemo } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMapStore } from '@/state/map.store';
import { Button } from '@/components/Button';
import { Tag } from '@/components/Tag';
import { translateCategory, translateBudget } from '@/lib/places';
import { useThreads } from '@/hooks/useChat';
import { Avatar } from '@/components/Avatar';
import { usePlaceParticipants } from '@/hooks/usePlaceParticipants';

function normalizePlaceTypeLabel(type?: string | null) {
  if (!type) return null;
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const placeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { selectedPlace, selectedGooglePlace } = useMapStore((state) => ({
    selectedPlace: state.selectedPlace,
    selectedGooglePlace: state.selectedGooglePlace,
  }));
  const { threads } = useThreads();

  const googlePlace =
    selectedGooglePlace && placeId && selectedGooglePlace.id === placeId
      ? selectedGooglePlace
      : null;
  const mockPlace =
    !googlePlace && selectedPlace && placeId && selectedPlace.id === placeId
      ? selectedPlace
      : null;

  const placeNameForQuery = googlePlace?.name ?? mockPlace?.name ?? mockPlace?.nameKo ?? null;
  const { participants, loading: participantsLoading, error: participantsError } =
    usePlaceParticipants(placeNameForQuery);

  const display = useMemo(() => {
    if (googlePlace) {
      const tagLabels: Array<{ label: string; type: 'category' | 'budget' }> = [];
      if (googlePlace.primaryTypeDisplayName) {
        tagLabels.push({ label: googlePlace.primaryTypeDisplayName, type: 'category' });
      }
      googlePlace.types?.forEach((type) => {
        const label = normalizePlaceTypeLabel(type);
        if (label && !tagLabels.some((tag) => tag.label === label)) {
          tagLabels.push({ label, type: 'category' });
        }
      });

      return {
        title: googlePlace.name,
        subtitle: googlePlace.address ?? '',
        secondaryTitle: undefined,
        rating: typeof googlePlace.rating === 'number' ? googlePlace.rating : undefined,
        ratingCount: googlePlace.userRatingsTotal,
        tags: tagLabels.slice(0, 3),
        image: googlePlace.photoUri ?? undefined,
        description: 'Google에서 가져온 장소 정보입니다. 원하는 밥친구와 약속을 잡아보세요!',
      };
    }

    if (mockPlace) {
      return {
        title: mockPlace.nameKo,
        secondaryTitle: mockPlace.name,
        subtitle: mockPlace.address,
        rating: undefined,
        ratingCount: undefined,
        tags: [
          { label: translateCategory(mockPlace.category), type: 'category' as const },
          { label: translateBudget(mockPlace.budget_level), type: 'budget' as const },
        ],
        image: `https://picsum.photos/seed/${mockPlace.id}/640/420`,
        description: mockPlace.description,
      };
    }

    return null;
  }, [googlePlace, mockPlace]);

  if (!display || !placeNameForQuery) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>장소 정보를 찾을 수 없습니다.</Text>
        <Button title="뒤로 가기" onPress={() => router.back()} />
      </View>
    );
  }

  const handlePropose = () => {
    if (threads.length === 0) {
      Alert.alert(
        '채팅방 없음',
        '식사를 제안하려면 먼저 밥친구와 채팅을 시작해야 합니다.',
        [{ text: '확인', onPress: () => router.push('/(tabs)/community') }],
      );
    } else {
      router.push({ pathname: '/chat/new' });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: display.title, headerShown: true }} />
      <ScrollView style={styles.container}>
        {display.image ? (
          <Image source={{ uri: display.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>이미지가 아직 없어요</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{display.title}</Text>
          {display.secondaryTitle ? (
            <Text style={styles.secondaryTitle}>{display.secondaryTitle}</Text>
          ) : null}
          {display.subtitle ? <Text style={styles.subtitle}>{display.subtitle}</Text> : null}

          <View style={styles.tagRow}>
            {display.rating ? (
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText}>⭐ {display.rating.toFixed(1)}</Text>
                {display.ratingCount ? (
                  <Text style={styles.ratingCount}> ({display.ratingCount})</Text>
                ) : null}
              </View>
            ) : null}
            {display.tags.map((tag) => (
              <View key={tag.label} style={styles.tagItem}>
                <Tag label={tag.label} type={tag.type} />
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>함께 가고 싶은 사람들</Text>
            {participantsLoading ? (
              <View style={styles.participantsLoading}>
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            ) : participants.length ? (
              <>
                <View style={styles.participantsRow}>
                  {participants.slice(0, 5).map((participant, index) => (
                    <View
                      key={participant.profile.id}
                      style={[styles.avatarWrapper, index === 0 ? null : styles.avatarOverlap]}
                    >
                      <Avatar
                        size="small"
                        name={participant.profile.display_name}
                        uri={participant.profile.primaryPhoto?.url}
                      />
                    </View>
                  ))}
                  {participants.length > 5 ? (
                    <View
                      style={[
                        styles.avatarMore,
                        participants.length ? styles.avatarOverlap : null,
                      ]}
                    >
                      <Text style={styles.avatarMoreText}>+{participants.length - 5}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.participantsCaption}>
                  {participants.length}명이 이 장소에서 밥을 먹고 싶어해요.
                </Text>
              </>
            ) : (
              <Text style={styles.participantsEmpty}>
                아직 신청한 사람이 없어요. 첫 번째로 제안해보세요!
              </Text>
            )}
            {participantsError ? (
              <Text style={styles.participantsError}>{participantsError}</Text>
            ) : null}
          </View>

          <View style={[styles.section, styles.infoSection]}>
            <Text style={styles.sectionTitle}>장소 정보</Text>
            <Text style={styles.description}>{display.description}</Text>
          </View>

          <View style={styles.ctaSection}>
            <Button title="같이 식사 제안하기" onPress={handlePropose} />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#444444',
  },
  image: {
    width: '100%',
    height: 270,
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#777777',
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  secondaryTitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    marginTop: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 16,
  },
  tagItem: {
    marginRight: 8,
    marginBottom: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    marginRight: 8,
    marginBottom: 8,
  },
  ratingText: {
    color: '#E65100',
    fontWeight: '600',
    marginRight: 2,
  },
  ratingCount: {
    color: '#E65100',
    fontWeight: '500',
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 12,
  },
  participantsLoading: {
    paddingVertical: 12,
    marginTop: 12,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 2,
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  avatarMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  participantsCaption: {
    fontSize: 14,
    color: '#555555',
    marginTop: 8,
  },
  participantsEmpty: {
    fontSize: 14,
    color: '#777777',
    marginTop: 12,
  },
  participantsError: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  infoSection: {
    marginBottom: 8,
  },
  ctaSection: {
    marginTop: 16,
    marginBottom: 12,
  },
});
