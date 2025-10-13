import { View, Text, Image, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Message } from '@/types/models';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

export function ChatBubble({ message, isOwn, showSender }: ChatBubbleProps) {
  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {showSender && !isOwn && message.sender && (
        <Text style={styles.senderName}>{message.sender.display_name}</Text>
      )}
      {message.image_url && (
        <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
      )}
      {message.text && (
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
      )}
      <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
        {format(new Date(message.created_at), 'HH:mm')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 4,
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#333333',
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTime: {
    color: '#999999',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  systemContainer: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
