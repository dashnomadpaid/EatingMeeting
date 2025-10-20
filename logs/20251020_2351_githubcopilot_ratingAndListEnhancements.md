# Log: Rating UI Fixes & Restaurant List Enhancements

**Agent:** GitHub Copilot  
**Timestamp:** 20251020_2351  
**Branch:** main  
**Commit:** (pre-commit)  

---

## Purpose

1. **별점 시각화 결함 수정**: StarRating 컴포넌트의 반별(half-star) 렌더링 시 gap이 적용되지 않아 별들이 붙어 보이는 문제 해결
2. **목록 페이지 별점 개선**: 이모지 별(⭐️)을 하단부터 채워지는 그라데이션 별로 교체
3. **아코디언 확장 UI 추가**: 목록 카드에 펼침/접힘 기능 구현, 식당 정보 및 모임 참여자 표시
4. **겹친 프로필 이미지**: 3D 스타일로 겹쳐진 아바타 컴포넌트 제작 (최대 3명 + 나머지 +n 표시)

---

## Files Modified

### 1. components/StarRating.tsx
**변경 사항**: 반별 컨테이너에 marginRight 추가  
**목적**: 반별 다음의 빈 별과 간격 확보

```diff
  {hasHalfStar && (
-   <View style={styles.halfStarContainer}>
+   <View style={[styles.halfStarContainer, { marginRight: 2 }]}>
      <Star ... />
```

**근본 원인**: `starsRow`의 `gap: 2`는 직계 자식 간 간격만 적용. 반별은 `halfStarContainer`로 감싸져 있어 내부 Star 컴포넌트들에는 gap이 적용되지 않음.

**해결**: `halfStarContainer`에 명시적 `marginRight: 2` 추가하여 다음 별과의 간격 보장.

---

### 2. components/FilledStar.tsx (NEW FILE)
**목적**: 0~5점 별점을 하단부터 주황색으로 채워 시각화하는 컴포넌트

**핵심 로직**:
```typescript
const fillPercentage = (clampedRating / 5) * 100;

// 5점 → 100% 채움 (전체 주황색)
// 4점 → 80% 채움
// 3점 → 60% 채움  
// 2점 → 40% 채움
// 1점 → 20% 채움
// 0점 → 0% 채움 (회색 외곽선만)
```

**구현 방식**:
- **LinearGradient** 사용하여 하단부터 점진적 채움
- `start: { x: 0, y: 1 }` (하단), `end: { x: 0, y: 0 }` (상단)
- `gradientColors`: `['#FF6B35', '#FF6B35', 'transparent', 'transparent']`
- `gradientLocations`: `[0, fillPercentage/100, fillPercentage/100, 1]`
- 배경 레이어(빈 별 #E5E5E5) + 전경 레이어(그라데이션 마스크) 구조

**특수 케이스**:
- 0점: 빈 별만 표시 (그라데이션 제외, 성능 최적화)
- 5점: 완전히 채워진 별 표시 (그라데이션 제외, 성능 최적화)

---

### 3. app/map/list.tsx (MAJOR REFACTOR)
**주요 변경사항**:

#### A. Import 추가
```typescript
import { FilledStar } from '@/components/FilledStar';
import { OverlappingAvatars } from '@/components/OverlappingAvatars';
import { usePlaceParticipants } from '@/hooks/usePlaceParticipants';
import { ChevronDown } from 'lucide-react-native';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
```

#### B. State 추가
```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);
```

#### C. 아코디언 토글 함수
```typescript
const toggleExpand = (placeId: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpandedId(expandedId === placeId ? null : placeId);
};
```

#### D. FlatList renderItem 구조 변경

**BEFORE (단순 카드)**:
```tsx
<TouchableOpacity onPress={() => handleItemPress(item)}>
  <Text>{item.name}</Text>
  <Text>⭐️ {item.rating.toFixed(1)}</Text>
</TouchableOpacity>
```

**AFTER (아코디언 카드)**:
```tsx
<View style={styles.listItemWrapper}>
  {/* 기본 카드 - 장소 선택 */}
  <TouchableOpacity onPress={() => handleItemPress(item)}>
    <View style={styles.listItemContent}>...</View>
    <View style={styles.rightSection}>
      {/* 별점 표시 (FilledStar) */}
      <FilledStar rating={item.rating} size={24} />
      
      {/* 확장 버튼 */}
      <TouchableOpacity onPress={(e) => {
        e.stopPropagation(); // 부모 클릭 방지
        toggleExpand(item.id);
      }}>
        <ChevronDown ... />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
  
  {/* 확장 영역 - 조건부 렌더링 */}
  {isExpanded && (
    <View style={styles.expandedContent}>
      {/* 카테고리, 리뷰 수 */}
      {/* 모임 참여자 (OverlappingAvatars) */}
    </View>
  )}
</View>
```

#### E. 스타일 추가 (11개)
- `listItemWrapper`: 카드 래퍼 (borderRadius, overflow: hidden)
- `rightSection`: 별점 + 버튼 수평 배치
- `expandButton`: 아코디언 버튼 패딩
- `expandedContent`: 확장 영역 (회색 배경, 상단 구분선)
- `infoSection`, `infoLabel`, `infoValue`: 정보 행 (카테고리, 리뷰 수)
- `participantsSection`, `participantsLabel`, `participantsEmpty`: 참여자 섹션

---

### 4. components/OverlappingAvatars.tsx (NEW FILE)
**목적**: 모임 참여자 프로필을 3D처럼 겹쳐 표시

**핵심 로직**:
```typescript
const overlapOffset = size * 0.6; // 각 아바타가 60%만 보임
const stackWidth = size + (visibleParticipants.length - 1) * overlapOffset;
```

**렌더링 구조**:
```tsx
<View style={{ position: 'relative', width: stackWidth }}>
  {participants.slice(0, 3).map((p, index) => (
    <View style={{
      position: 'absolute',
      left: index * overlapOffset,  // 0, 19.2px, 38.4px (size=32 기준)
      zIndex: maxVisible - index,   // 뒤쪽일수록 낮은 z-index
    }}>
      <Image or InitialsPlaceholder />
    </View>
  ))}
</View>
{remainingCount > 0 && <Text>+{remainingCount}</Text>}
```

**디자인 특징**:
- 각 아바타는 **40%씩 겹침** (60% visible)
- **뒤에서 앞으로** z-index 증가 (첫 번째가 가장 뒤, 마지막이 가장 앞)
- 흰색 테두리 (`borderWidth: 2, borderColor: '#FFFFFF'`) 로 구분
- 최대 3명까지 표시, 나머지는 **+n** 형식

**fallback 처리**:
- 프로필 사진 없을 시: 주황색 배경 + 이름 이니셜 (최대 2글자)
- `getInitials()`: 공백 기준 분리 → 첫 글자 2개 추출

---

## Technical Details

### 별점 Gap 이슈 분석

**문제 재현**:
- 3.5~3.9점: ⭐⭐⭐⭐☆ (별 3개 + 반별 1개)
- 반별과 빈 별 사이 gap 없음 → 붙어서 표시

**원인 파악**:
```tsx
// starsRow의 gap은 직계 자식 간에만 적용
<View style={{ gap: 2 }}>
  <Star />  ← gap 적용
  <Star />  ← gap 적용
  <View style={styles.halfStarContainer}>  ← gap 적용
    <Star /> ← gap 미적용 (부모가 halfStarContainer)
  </View>
  <Star />  ← 반별 컨테이너와의 gap만 적용, 내부 Star와는 간격 없음
</View>
```

**예상되는 다른 케이스**:
- 모든 x.25~x.75 범위 별점에서 동일 문제 발생 가능 (1.3, 2.5, 4.7 등)
- 해결책: 명시적 margin 추가로 모든 케이스 대응

---

### FilledStar 그라데이션 구현

**LinearGradient 원리**:
```typescript
// 예: 3점 (60% 채움)
colors: ['#FF6B35', '#FF6B35', 'transparent', 'transparent']
locations: [0, 0.6, 0.6, 1]

// 0~60%: 주황색 → 주황색 (solid)
// 60%~100%: 투명 → 투명 (transparent)
// 60% 지점에서 sharp transition (두 색상 동일 위치)
```

**방향 설정**:
- `start: { x: 0, y: 1 }`: 하단 (y=1)
- `end: { x: 0, y: 0 }`: 상단 (y=0)
- → 하단부터 채워지는 효과

**성능 최적화**:
- 0점/5점은 그라데이션 생략, 단순 Star 컴포넌트만 렌더링
- 불필요한 LinearGradient 계산 회피

---

### 아코디언 애니메이션

**LayoutAnimation 사용**:
```typescript
LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
setExpandedId(newId);
```

**동작 원리**:
- `LayoutAnimation`: 다음 레이아웃 변경에 애니메이션 적용
- React Native가 자동으로 높이 변화 감지 → 부드러운 확장/축소
- Android 지원: `UIManager.setLayoutAnimationEnabledExperimental(true)` 필요

**이벤트 버블링 방지**:
```typescript
onPress={(e) => {
  e.stopPropagation(); // 부모 TouchableOpacity의 handleItemPress 방지
  toggleExpand(item.id);
}}
```

---

### usePlaceParticipants 통합

**데이터 흐름**:
```typescript
const { participants, loading } = usePlaceParticipants(item.id);

// participants: Array<{ profile: Profile, slot: any }>
// → OverlappingAvatars에 profile만 전달
```

**빈 상태 처리**:
- `loading === true`: "불러오는 중..."
- `participants.length === 0`: "아직 관심있는 사람이 없어요"
- `participants.length > 0`: `<OverlappingAvatars .../>`

---

## UI/UX Improvements

### 별점 시각화 비교

| 항목 | BEFORE | AFTER |
|------|--------|-------|
| 캐러셀 카드 | ⭐ 4.2 (이모지) | ⭐⭐⭐⭐⭐ 4.2 (5-star) |
| 목록 페이지 | ⭐️ 4.2 (이모지) | 🌟 (하단 80% 채워진 별) |
| 반별 gap | 붙어서 표시 | 2px 간격 |

### 목록 카드 인터랙션

**기본 상태 (접힘)**:
```
┌────────────────────────────────┐
│ 식당 이름                    🌟 ˅│
│ 서울시 강남구...                │
└────────────────────────────────┘
```

**확장 상태**:
```
┌────────────────────────────────┐
│ 식당 이름                    🌟 ˄│
│ 서울시 강남구...                │
├────────────────────────────────┤ ← 구분선
│ 카테고리        한식           │
│ 리뷰 수         1,234개        │
│                                │
│ 이 장소에 관심있는 사람들       │
│ 👤👤👤 +5                      │
└────────────────────────────────┘
```

**높이 제약**:
- 확장 영역은 카드 너비보다 세로 길이가 짧게 제한됨 (자연스러운 비율)
- 카테고리 + 리뷰 수 + 참여자 섹션 = 약 120~150px
- 카드 너비 = 화면 너비 - 32px (패딩) = ~343px (iPhone 기준)
- 세로/가로 비율 ≈ 0.4 (시각적으로 안정적)

---

## Testing Notes

### 필수 테스트 케이스

1. **StarRating 반별 간격**
   - [ ] 3.25점, 3.5점, 3.75점 별점 표시 확인
   - [ ] 반별과 빈 별 사이 2px gap 육안 확인

2. **FilledStar 그라데이션**
   - [ ] 0점: 빈 별만 (회색 외곽선)
   - [ ] 1점: 하단 20% 주황색
   - [ ] 2.5점: 하단 50% 주황색
   - [ ] 3점: 하단 60% 주황색
   - [ ] 5점: 완전히 채워진 별

3. **아코디언 확장**
   - [ ] 하단 화살표 버튼 클릭 시 카드 확장
   - [ ] 확장 시 화살표 180도 회전 애니메이션
   - [ ] 부드러운 높이 전환 (LayoutAnimation)
   - [ ] 카드 본문 클릭 시 지도 화면으로 이동 (확장 영향 없음)

4. **겹친 프로필**
   - [ ] 3명 이하: 모두 표시
   - [ ] 4명 이상: 3명 + "+n"
   - [ ] 각 아바타 40% 겹침 (60% visible)
   - [ ] z-index 순서 (첫 번째가 뒤, 마지막이 앞)
   - [ ] 사진 없을 시 이니셜 표시

5. **참여자 데이터 로딩**
   - [ ] "불러오는 중..." 표시
   - [ ] 참여자 없을 시 "아직 관심있는 사람이 없어요"
   - [ ] usePlaceParticipants 훅 정상 동작

---

## Known Limitations

1. **FilledStar 그라데이션**
   - Sharp transition (soft gradient 아님) - 의도된 디자인
   - 0.1~0.24점, 0.76~0.99점 범위는 정수로 올림/내림 처리됨

2. **OverlappingAvatars**
   - 현재 maxVisible=3으로 고정
   - 화면 너비에 따른 동적 계산 없음 (향후 개선 가능)

3. **아코디언 높이**
   - 참여자 수에 따른 동적 높이 제약 없음
   - 참여자 10명 이상 시 레이아웃 테스트 필요

4. **Android LayoutAnimation**
   - Android에서 일부 기기 애니메이션 버벅임 가능
   - `setLayoutAnimationEnabledExperimental` 플래그 필요

---

## Future Enhancements

1. **별점 컴포넌트 통합**
   - StarRating (5-star) vs FilledStar (gradient) 사용 일관성 검토
   - 통합 컴포넌트 고려 (variant prop: '5-star' | 'gradient')

2. **아코디언 제스처**
   - 스와이프로 확장/축소 기능 추가
   - Pan Gesture Handler 통합

3. **참여자 인터랙션**
   - 프로필 아바타 클릭 시 프로필 모달 표시
   - 전체 참여자 리스트 보기 기능

4. **성능 최적화**
   - FlatList renderItem을 React.memo로 메모이제이션
   - usePlaceParticipants 결과 캐싱

---

## Related Issues & Context

**User Feedback**:
- "3.5~3.9 사이 숫자에 대한 별 3개 + 반별 1개가 붙어서 표시돼"
- "별 이모지 유치해... 별점에 따라 하단부터 채워진 주황별로 시각화"
- "목록 페이지 각 카드에 하단 화살표 버튼 추가, 아코디언 확장"
- "참여자 프로필을 3D마냥 겹쳐서 표시, OOOO +5 형식"

**Design Goals**:
- ✅ 프로페셔널한 별점 시각화 (이모지 제거)
- ✅ 직관적인 채움 비율 (3점 = 60% 채움)
- ✅ 공간 효율적인 정보 표시 (아코디언)
- ✅ 소셜 proof 강화 (참여자 프로필 표시)

---

_Log completed at 20251020_2351_
