import { useState, useRef, useEffect } from 'react';
import { View, FlatList, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useMessages, sendMessage, useProposals } from '@/hooks/useChat';
import { useAuthStore } from '@/state/auth.store';
import { ChatBubble } from '@/components/ChatBubble';
import { ProposalCard } from '@/components/ProposalCard';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams();
  const { messages } = useMessages(id as string);
  const { proposals } = useProposals(id as string);
  const { session } = useAuthStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd();
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    const messageText = text.trim();
    setText('');

    const { error } = await sendMessage(id as string, messageText);
    if (error) {
      setText(messageText);
    }
    setSending(false);
  };

  const allItems = [
    ...proposals.map((p) => ({ type: 'proposal' as const, data: p })),
    ...messages.map((m) => ({ type: 'message' as const, data: m })),
  ].sort((a, b) => {
    const aTime = new Date(a.data.created_at).getTime();
    const bTime = new Date(b.data.created_at).getTime();
    return aTime - bTime;
  });

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="채팅" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={allItems}
          keyExtractor={(item, index) => `${item.type}-${item.data.id}-${index}`}
          renderItem={({ item }) => {
            if (item.type === 'proposal') {
              return <ProposalCard proposal={item.data} threadId={id as string} />;
            }
            return (
              <ChatBubble
                message={item.data}
                isOwn={item.data.sender_id === session?.user.id}
                showSender
              />
            );
          }}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="메시지를 입력하세요..."
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Send color={text.trim() ? '#FFFFFF' : '#999'} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  messageList: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#EEE',
  },
});
