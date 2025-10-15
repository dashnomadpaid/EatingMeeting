import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Trash2, Star } from 'lucide-react-native';
import { useAuthStore } from '@/state/auth.store';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/storage';
import { Photo } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function PhotosScreen() {
  const { profile } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_primary', { ascending: false });
    if (data) setPhotos(data);
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 6) {
      Alert.alert('사진 제한', '최대 6장까지만 업로드할 수 있습니다.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한이 필요합니다', '사진에 접근하려면 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (!result.canceled && profile) {
      setUploading(true);
      const { url, error } = await uploadImage(
        result.assets[0].uri,
        'profile-photos',
        `${profile.id}/${Date.now()}`
      );

      if (error || !url) {
        Alert.alert('업로드 실패', '사진 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
      } else {
        const { error: dbError } = await supabase.from('photos').insert({
          user_id: profile.id,
          url,
          is_primary: photos.length === 0,
        });

        if (dbError) {
          Alert.alert('오류', dbError.message);
        } else {
          await loadPhotos();
        }
      }
      setUploading(false);
    }
  };

  const handleSetPrimary = async (photo: Photo) => {
    if (photo.is_primary) return;

    // Remove primary from all photos
    await supabase
      .from('photos')
      .update({ is_primary: false })
      .eq('user_id', profile!.id);

    // Set new primary
    const { error } = await supabase
      .from('photos')
      .update({ is_primary: true })
      .eq('id', photo.id);

    if (error) {
      Alert.alert('오류', error.message);
    } else {
      await loadPhotos();
    }
  };

  const handleDeletePhoto = (photo: Photo) => {
    Alert.alert(
      '사진 삭제',
      photo.is_primary 
        ? '대표 사진을 삭제하시겠어요? 다른 사진이 자동으로 대표 사진이 됩니다.'
        : '이 사진을 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('photos').delete().eq('id', photo.id);
            if (error) {
              Alert.alert('오류', error.message);
            } else {
              // If deleted primary and there are other photos, set first one as primary
              if (photo.is_primary && photos.length > 1) {
                const remainingPhotos = photos.filter(p => p.id !== photo.id);
                await supabase
                  .from('photos')
                  .update({ is_primary: true })
                  .eq('id', remainingPhotos[0].id);
              }
              await loadPhotos();
            }
          },
        },
      ]
    );
  };

  const photoSlots = Array.from({ length: 6 }, (_, i) => photos[i] || null);

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="사진 관리" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>프로필 사진 가이드</Text>
          <Text style={styles.infoText}>• 첫 번째 사진이 대표 사진으로 표시됩니다</Text>
          <Text style={styles.infoText}>• 얼굴이 잘 보이는 사진을 추천해요</Text>
          <Text style={styles.infoText}>• 최대 6장까지 업로드 가능</Text>
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>{photos.length} / 6</Text>
          </View>
        </View>

        {/* Photo Grid */}
        <View style={styles.grid}>
          {photoSlots.map((photo, index) => (
            <View key={index} style={styles.photoSlot}>
              {photo ? (
                <TouchableOpacity
                  style={styles.photoContainer}
                  onLongPress={() => handleSetPrimary(photo)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: photo.url }} style={styles.photo} />
                  
                  {/* Primary Badge */}
                  {photo.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Star color="#FFFFFF" size={12} fill="#FFFFFF" />
                      <Text style={styles.primaryText}>대표</Text>
                    </View>
                  )}

                  {/* Photo Number */}
                  <View style={styles.photoNumber}>
                    <Text style={styles.photoNumberText}>{index + 1}</Text>
                  </View>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(photo)}
                  >
                    <Trash2 color="#FFFFFF" size={18} />
                  </TouchableOpacity>

                  {/* Overlay gradient for better button visibility */}
                  <View style={styles.photoOverlay} pointerEvents="none" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addPhotoSlot}
                  onPress={handleAddPhoto}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  <View style={styles.addPhotoIcon}>
                    <Plus color="#8E8E93" size={32} strokeWidth={2} />
                  </View>
                  <Text style={styles.addPhotoText}>
                    {uploading ? '업로드 중...' : '사진 추가'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Help Text */}
        {photos.length > 0 && !photos[0].is_primary && (
          <View style={styles.helpCard}>
            <Text style={styles.helpText}>
              💡 사진을 길게 눌러서 대표 사진으로 설정할 수 있어요
            </Text>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
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
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 6,
  },
  photoCount: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'flex-end',
  },
  photoCountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoSlot: {
    width: '48.5%',
    aspectRatio: 0.8,
    marginBottom: 12,
  },
  photoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
  },
  primaryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoNumber: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,59,48,0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addPhotoSlot: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  addPhotoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  addPhotoText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE5DC',
  },
  helpText: {
    fontSize: 14,
    color: '#FF6B35',
    lineHeight: 20,
    textAlign: 'center',
  },
});

