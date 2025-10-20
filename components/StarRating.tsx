import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number | null | undefined;
  size?: number;
  showCount?: boolean;
  userRatingsTotal?: number;
}

export function StarRating({ rating, size = 12, showCount = false, userRatingsTotal }: StarRatingProps) {
  // 별점이 없는 경우
  if (typeof rating !== 'number') {
    return (
      <View style={styles.container}>
        <Text style={styles.noRatingText}>별점 없음</Text>
      </View>
    );
  }

  // 5점 만점 별점 계산
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {/* 채워진 별 */}
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            fill="#FF6B35"
            color="#FF6B35"
            strokeWidth={1.5}
          />
        ))}
        
        {/* 반 채워진 별 */}
        {hasHalfStar && (
          <View style={[styles.halfStarContainer, { marginRight: 2 }]}>
            <Star
              size={size}
              fill="transparent"
              color="#E5E5E5"
              strokeWidth={1.5}
              style={styles.halfStarEmpty}
            />
            <View style={[styles.halfStarMask, { width: size / 2 }]}>
              <Star
                size={size}
                fill="#FF6B35"
                color="#FF6B35"
                strokeWidth={1.5}
              />
            </View>
          </View>
        )}
        
        {/* 빈 별 */}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={size}
            fill="transparent"
            color="#E5E5E5"
            strokeWidth={1.5}
          />
        ))}
      </View>
      
      {/* 별점 숫자 표시 */}
      <Text style={[styles.ratingText, { fontSize: size }]}>
        {rating.toFixed(1)}
      </Text>
      
      {/* 리뷰 수 표시 */}
      {showCount && userRatingsTotal ? (
        <Text style={[styles.countText, { fontSize: size * 0.9 }]}>
          ({userRatingsTotal})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  halfStarContainer: {
    position: 'relative',
  },
  halfStarEmpty: {
    position: 'absolute',
  },
  halfStarMask: {
    overflow: 'hidden',
  },
  ratingText: {
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 2,
  },
  countText: {
    color: '#999999',
    fontWeight: '400',
  },
  noRatingText: {
    fontSize: 12,
    color: '#BBBBBB',
    fontWeight: '500',
  },
});
