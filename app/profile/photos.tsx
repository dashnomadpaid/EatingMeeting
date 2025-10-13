import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Trash2 } from 'lucide-react-native';
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한이 필요합니다', '사진에 접근하려면 권한을 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && profile) {
      setUploading(true);
      const { url, error } = await uploadImage(
        result.assets[0].uri,
        'profile-photos',
        `${profile.id}/${Date.now()}`
      );

      if (error || !url) {
        Alert.alert('오류', '사진 업로드에 실패했습니다.');
      } else {
        const { error: dbError } = await supabase.from('photos').insert({
          user_id: profile.id,
          url,
          is_primary: photos.length === 0,
        });

        if (dbError) {
          Alert.alert('오류', dbError.message);
        } else {
          loadPhotos();
        }
      }
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photo: Photo) => {
    Alert.alert('사진 삭제', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('photos').delete().eq('id', photo.id);
          if (error) {
            Alert.alert('오류', error.message);
          } else {
            loadPhotos();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="사진 관리" subtitle="최대 6장까지 업로드할 수 있어요" />
      <View style={styles.container}>
        <FlatList
          data={photos}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.photoContainer}>
              <Image source={{ uri: item.url }} style={styles.photo} />
              {item.is_primary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryText}>대표</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhoto(item)}
              >
                <Trash2 color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            photos.length < 6 ? (
              <TouchableOpacity style={styles.addButton} onPress={handleAddPhoto} disabled={uploading}>
                <Plus color="#FF6B35" size={32} />
                <Text style={styles.addText}>{uploading ? '업로드 중...' : '사진 추가'}</Text>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.grid}
        />
      </View>
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
  grid: {
    padding: 8,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  addText: {
    marginTop: 8,
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
});
