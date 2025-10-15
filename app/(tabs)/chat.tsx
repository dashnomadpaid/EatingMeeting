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
        contentContainerStyle={{ paddingBottom: 16 }}
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
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: '#000000',
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#000000',
  },
  threadTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
