import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/auth.store';
import { Avatar } from '@/components/Avatar';
import { Profile } from '@/types/models';
import { createOrOpenDM } from '@/hooks/useCommunity';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function NewChatScreen() {
  const { session } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', session.user.id)
      .limit(50);
    if (data) setUsers(data);
  };

  const handleSelectUser = async (user: Profile) => {
    const threadId = await createOrOpenDM(user.id);
    if (threadId) {
      router.replace(`/chat/thread/${threadId}`);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="새 채팅" />
      <View style={styles.container}>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelectUser(item)}
            >
              <Avatar uri={item.primaryPhoto?.url} name={item.display_name} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.bio} numberOfLines={1}>
                  {item.bio || '소개가 없습니다'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    color: '#666',
  },
});
