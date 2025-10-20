import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FilledStarProps {
  rating: number; // 0~5 사이의 별점
  size?: number;
}

/**
 * 별점에 따라 하단부터 주황색으로 채워지는 별 컴포넌트
 * 5점 = 100% 채움 (전체 주황색)
 * 4점 = 80% 채움
 * 3점 = 60% 채움
 * 2점 = 40% 채움
 * 1점 = 20% 채움
 * 0점 = 0% 채움 (회색 외곽선만)
 */
export function FilledStar({ rating, size = 20 }: FilledStarProps) {
  // 별점을 0~5 범위로 제한
  const clampedRating = Math.max(0, Math.min(5, rating));
  
  // 채움 비율 계산 (0~100%)
  const fillPercentage = (clampedRating / 5) * 100;
  
  // 그라데이션 색상 설정
  // fillPercentage보다 아래는 주황색, 위는 투명
  const gradientColors = fillPercentage > 0 
    ? ['#FF6B35', '#FF6B35', 'transparent', 'transparent'] as const
    : ['transparent', 'transparent'] as const;
  
  // 그라데이션 위치 설정 (하단부터 채워짐)
  const gradientLocations = fillPercentage > 0
    ? [0, fillPercentage / 100, fillPercentage / 100, 1] as const
    : [0, 1] as const;

  if (fillPercentage === 0) {
    // 0점인 경우 빈 별만 표시
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Star
          size={size}
          fill="transparent"
          color="#E5E5E5"
          strokeWidth={1.5}
        />
      </View>
    );
  }

  if (fillPercentage === 100) {
    // 5점인 경우 완전히 채워진 별 표시
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Star
          size={size}
          fill="#FF6B35"
          color="#FF6B35"
          strokeWidth={1.5}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* 배경: 빈 별 (회색 외곽선) */}
      <View style={styles.background}>
        <Star
          size={size}
          fill="transparent"
          color="#E5E5E5"
          strokeWidth={1.5}
        />
      </View>
      
      {/* 전경: 그라데이션 마스크된 채워진 별 */}
      <View style={styles.foreground}>
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          start={{ x: 0, y: 1 }} // 하단 시작
          end={{ x: 0, y: 0 }}   // 상단 끝
          style={StyleSheet.absoluteFill}
        >
          <Star
            size={size}
            fill="#FF6B35"
            color="#FF6B35"
            strokeWidth={1.5}
          />
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
  },
  foreground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
