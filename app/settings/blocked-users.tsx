import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/auth.store';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Profile } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function BlockedUsersScreen() {
  const { session } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    if (!session) return;
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', session.user.id);

    if (blocks && blocks.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', blocks.map((b) => b.blocked_id));
      if (profiles) setBlockedUsers(profiles);
    }
  };

  const handleUnblock = (userId: string) => {
    Alert.alert('차단 해제', '정말 해제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단 해제',
        onPress: async () => {
          if (!session) return;
          const { error } = await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', session.user.id)
            .eq('blocked_id', userId);
          if (!error) {
            loadBlockedUsers();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="차단한 사용자" subtitle="여기에서 차단을 해제할 수 있어요" />
      <View style={styles.container}>
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Avatar uri={item.primaryPhoto?.url} name={item.display_name} />
              <Text style={styles.name}>{item.display_name}</Text>
              <Button title="차단 해제" onPress={() => handleUnblock(item.id)} variant="outline" />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>차단한 사용자가 없습니다</Text>
            </View>
          }
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
    backgroundColor: '#FFFFFF',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  name: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
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
