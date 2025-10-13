import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useThreads } from '@/hooks/useChat';
import { Avatar } from '@/components/Avatar';
import { Thread } from '@/types/models';
import { Plus } from 'lucide-react-native';

export default function ChatScreen() {
  const { threads } = useThreads();

  const getThreadName = (thread: Thread) => {
    if (thread.participants.length === 1) {
      return thread.participants[0].display_name;
    }
    return thread.participants.map((p) => p.display_name).join(', ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>채팅</Text>
        <TouchableOpacity onPress={() => router.push('/chat/new')}>
          <Plus color="#FF6B35" size={28} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.threadItem}
            onPress={() => router.push(`/chat/thread/${item.id}`)}
          >
            <Avatar
              uri={item.participants[0]?.primaryPhoto?.url}
              name={getThreadName(item)}
              size="medium"
            />
            <View style={styles.threadInfo}>
              <View style={styles.threadHeader}>
                <Text style={styles.threadName} numberOfLines={1}>
                  {getThreadName(item)}
                </Text>
                <Text style={styles.threadTime}>
                  {format(new Date(item.updated_at), 'HH:mm')}
                </Text>
              </View>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage?.text || '메시지가 아직 없습니다'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>채팅이 아직 없습니다</Text>
            <Text style={styles.emptyHint}>함께 식사할 사람을 찾아보세요!</Text>
          </View>
        }
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
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  threadInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  threadTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
  },
});
