import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMapStore } from '@/state/map.store';
import { BackButton } from '@/components/BackButton';

export default function MapListScreen() {
  const insets = useSafeAreaInsets();
  const places = useMapStore((state) => state.googlePlaces);
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);

  const handleItemPress = (item: any) => {
    setSelectedGooglePlace(item);
    router.back();
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
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleItemPress(item)}
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
            {item.rating && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>⭐️ {item.rating.toFixed(1)}</Text>
              </View>
            )}
          </TouchableOpacity>
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
});
