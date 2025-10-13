import { View, Text, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { Slot } from '@/types/models';
import { Button } from './Button';
import { respondToProposal, cancelProposal } from '@/hooks/useChat';
import { useAuthStore } from '@/state/auth.store';

interface ProposalCardProps {
  proposal: Slot;
  threadId: string;
}

export function ProposalCard({ proposal, threadId }: ProposalCardProps) {
  const { session } = useAuthStore();
  const isProposer = proposal.proposer_id === session?.user.id;
  const canRespond = !isProposer && proposal.status === 'proposed';

  const handleAccept = async () => {
    const { error } = await respondToProposal(proposal.id, threadId, 'accepted');
    if (error) {
      Alert.alert('오류', error.message);
    }
  };

  const handleDecline = async () => {
    const { error } = await respondToProposal(proposal.id, threadId, 'declined');
    if (error) {
      Alert.alert('오류', error.message);
    }
  };

  const handleCancel = async () => {
    Alert.alert('제안 취소', '이 식사 제안을 취소하시겠어요?', [
      { text: '아니요', style: 'cancel' },
      {
        text: '네, 취소할게요',
        style: 'destructive',
        onPress: async () => {
          const { error } = await cancelProposal(proposal.id, threadId);
          if (error) {
            Alert.alert('오류', error.message);
          }
        },
      },
    ]);
  };

  const statusColors = {
    proposed: '#FF6B35',
    accepted: '#4CAF50',
    declined: '#999',
    canceled: '#999',
  };
  const statusLabels = {
    proposed: '제안됨',
    accepted: '수락됨',
    declined: '거절됨',
    canceled: '취소됨',
  } as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>식사 제안</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[proposal.status] }]}>
          <Text style={styles.statusText}>{statusLabels[proposal.status]}</Text>
        </View>
      </View>

      <Text style={styles.placeName}>{proposal.place_name}</Text>
      {proposal.place_category && (
        <Text style={styles.placeCategory}>{proposal.place_category}</Text>
      )}
      {proposal.place_address && (
        <Text style={styles.placeAddress}>{proposal.place_address}</Text>
      )}

      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>일시:</Text>
        <Text style={styles.timeValue}>
          {format(new Date(proposal.starts_at), 'yyyy년 MM월 dd일 • HH:mm')}
        </Text>
      </View>

      {proposal.notes && (
        <Text style={styles.notes}>{proposal.notes}</Text>
      )}

      {canRespond && (
        <View style={styles.actions}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Button title="수락" onPress={handleAccept} variant="primary" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Button title="거절" onPress={handleDecline} variant="outline" />
          </View>
        </View>
      )}

      {isProposer && proposal.status === 'proposed' && (
        <Button title="제안 취소" onPress={handleCancel} variant="outline" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8F5',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#FFE5D9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  timeValue: {
    fontSize: 14,
    color: '#333',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
