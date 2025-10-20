import { View, Text, Image, StyleSheet } from 'react-native';
import { Profile } from '@/types/models';

interface OverlappingAvatarsProps {
  participants: Profile[];
  maxVisible?: number;
  size?: number;
}

/**
 * 프로필 사진을 3D처럼 겹쳐서 표시하는 컴포넌트
 * 최대 3명까지 표시하고 나머지는 +n 형식으로 표시
 */
export function OverlappingAvatars({ 
  participants, 
  maxVisible = 3,
  size = 32 
}: OverlappingAvatarsProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);
  
  // 겹침 오프셋 (각 아바타가 좌측으로 약간씩만 보이도록)
  const overlapOffset = size * 0.6; // 60%만 보임 (40%는 다음 아바타에 가려짐)
  
  // 전체 스택의 너비 계산
  const stackWidth = visibleParticipants.length > 0 
    ? size + (visibleParticipants.length - 1) * overlapOffset 
    : 0;

  // 이름에서 이니셜 추출
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatarStack, { height: size, width: stackWidth }]}>
        {visibleParticipants.map((participant, index) => {
          const photoUrl = typeof participant.primaryPhoto?.url === 'string' 
            ? participant.primaryPhoto.url 
            : null;
          
          return (
            <View
              key={participant.id}
              style={[
                styles.avatarWrapper,
                {
                  left: index * overlapOffset,
                  width: size,
                  height: size,
                  zIndex: maxVisible - index, // 뒤에 있을수록 낮은 z-index
                },
              ]}
            >
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#FF6B35' }]}>
                  <Text style={[styles.avatarInitials, { fontSize: size * 0.4 }]}>
                    {getInitials(participant.display_name)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      
      {remainingCount > 0 && (
        <Text style={[styles.remainingText, { fontSize: size * 0.5, marginLeft: 8 }]}>
          +{remainingCount}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStack: {
    position: 'relative',
    flexDirection: 'row',
  },
  avatarWrapper: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  remainingText: {
    fontWeight: '600',
    color: '#666666',
  },
});
