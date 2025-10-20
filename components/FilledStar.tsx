import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface FilledStarProps {
  rating: number; // 0~5 사이의 별점
  size?: number;
}

/**
 * 별점에 따라 하단부터 수직으로 주황색이 채워지는 별 컴포넌트
 * 5점 = 100% 채움 (전체 주황색)
 * 4점 = 80% 채움
 * 3점 = 60% 채움
 * 2점 = 40% 채움
 * 1점 = 20% 채움
 * 0점 = 0% 채움 (그레이로 가득 채워진 별)
 * 별점 없음 = 0점과 동일 (그레이로 가득 채워진 별)
 * 
 * 구현 방식: 별 아이콘을 겹쳐서 배치
 * 1. 하단 레이어: 그레이 채워진 별 (배경, #E5E5E5)
 * 2. 상단 레이어: 주황색 채워진 별 (overflow: hidden + bottom offset으로 수직 fill 구현)
 */
export function FilledStar({ rating, size = 20 }: FilledStarProps) {
  // 별점을 0~5 범위로 제한
  const clampedRating = Math.max(0, Math.min(5, rating));
  
  // 채움 비율 계산 (0~100%)
  const fillPercentage = (clampedRating / 5) * 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* 배경: 그레이 채워진 별 (아웃라인 + fill) */}
      <View style={styles.backgroundStar}>
        <Star
          size={size}
          fill="#E5E5E5"
          color="#E5E5E5"
          strokeWidth={1.5}
        />
      </View>
      
      {/* 전경: 주황색 채워진 별 (하단부터 fillPercentage만큼 보이도록) */}
      {fillPercentage > 0 && (
        <View 
          style={[
            styles.foregroundStar,
            { 
              height: `${fillPercentage}%`,
              bottom: 0,
            }
          ]}
        >
          <View style={{ position: 'absolute', bottom: 0 }}>
            <Star
              size={size}
              fill="#FF6B35"
              color="#FF6B35"
              strokeWidth={1.5}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundStar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  foregroundStar: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
    width: '100%',
  },
});
