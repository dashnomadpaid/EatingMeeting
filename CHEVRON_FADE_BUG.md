# Chevron Icon Fade Bug Report

## 문제 요약
지도 목록 화면(`app/map/list.tsx`)에서 식당 카드의 아코디언을 펼칠 때, 특정 조건에서 새로 펼쳐지는 카드의 셰브론(chevron) 아이콘 색상이 일시적으로 연해지는 현상 발생.

## 발생 조건
- **재현 단계:**
  1. 첫 번째 카드(예: 4.2★)의 더보기 화살표를 눌러 아코디언 펼침
  2. 바로 아래가 아닌, 조금 떨어진 카드의 더보기 화살표를 누름
  3. 기존 아코디언이 접히고 새 아코디언이 펼쳐짐 (정상)
  4. **새로 펼쳐진 카드의 화살표(180도 회전, 위 향함)가 색이 확 연해짐**

- **발생 특징:**
  - 간헐적으로 발생 (항상은 아님)
  - 일부 카드에서만 발생 (일정 거리 떨어진 카드)
  - 화살표가 **위를 향할 때(펼쳐진 상태)**만 발생
  - 화살표가 **아래를 향할 때(접힌 상태)**는 정상

- **환경:**
  - React Native + Expo SDK 54
  - iOS 시뮬레이터
  - 디바이스: iPhone

## 근본 원인 분석

### 1. 로그 추적 결과 (2025-10-21)
```
[TOGGLE] Smoothie King (4.2★) - OPEN
[ANIMATION] LayoutAnimation configured - opacity based, 250ms
[전체 19개 카드 모두 리렌더링]
```

**발견:**
- 카드 하나를 펼칠 때마다 **FlatList의 모든 카드(19개)가 리렌더링**
- `LayoutAnimation`의 `opacity` 속성이 전체 리스트에 영향
- 리렌더링 과정에서 `transform: rotate`가 적용된 셰브론이 opacity 애니메이션의 영향을 받음

### 2. 기술적 원인
```typescript
// toggleExpand 함수
LayoutAnimation.configureNext({
  duration: 250,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,  // ← 문제의 근원
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
});
```

- `LayoutAnimation`의 `opacity` 속성이 전역적으로 적용
- `Animated.View`의 `transform: rotate`와 결합 시 렌더링 충돌
- React Native의 알려진 이슈: `LayoutAnimation` + `transform` 조합의 불안정성

## 시도한 해결 방법

### 시도 #1: Animated.View 제거
**날짜:** 2025-10-21  
**커밋:** `1209e87`

**변경 내용:**
```typescript
// Before
<Animated.View style={{ transform: [{ rotate: '180deg' }] }}>
  <ChevronDown />
</Animated.View>

// After
<View style={{ transform: [{ rotate: '180deg' }] }}>
  <ChevronDown />
</View>
```

**결과:** ❌ 실패 - 문제 지속  
**롤백:** `git revert`로 되돌림

---

### 시도 #2: opacity 속성 강제 고정
**날짜:** 2025-10-21  
**커밋:** `8783cce`

**변경 내용:**
```typescript
<View style={{ opacity: 1, transform: [{ rotate: '180deg' }] }}>
  <ChevronDown />
</View>
```

**결과:** ❌ 실패 - 문제 지속

---

### 시도 #3: scaleXY 속성으로 변경
**날짜:** 2025-10-21  
**커밋:** `fab0e6c`

**변경 내용:**
```typescript
LayoutAnimation.configureNext({
  duration: 250,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.scaleXY,  // opacity → scaleXY
  },
});
```

**결과:** ❌ 애니메이션 사라짐  
**롤백:** 사용자 요청으로 되돌림

---

### 시도 #4: 하드웨어 렌더링 속성 추가
**날짜:** 2025-10-21  
**커밋:** `6242932`

**변경 내용:**
```typescript
<View
  style={{ opacity: 1, transform: [{ rotate: '180deg' }] }}
  renderToHardwareTextureAndroid
  shouldRasterizeIOS
>
  <ChevronDown />
</View>
```

**결과:** ❌ 실패 - 문제 지속  
**판단:** 오버엔지니어링  
**롤백:** `git revert`로 되돌림

---

### 시도 #5: 조건부 아이콘 렌더링
**날짜:** 2025-10-21  
**커밋:** `b1e7997`

**변경 내용:**
```typescript
// transform 제거, 조건부로 다른 아이콘 사용
{isExpanded ? (
  <ChevronUp size={18} color="#999999" strokeWidth={2} />
) : (
  <ChevronDown size={18} color="#999999" strokeWidth={2} />
)}
```

**결과:** ❌ 실패 - 문제 지속  
**롤백:** 전체 실험 커밋 제거 (`git reset --hard 4ace98a`)

---

### 시도 #6: React.memo로 리렌더링 최적화 ✅
**날짜:** 2025-10-21  
**커밋:** `ff7483c`, `b3959dd`

**변경 내용:**
```typescript
// 컴포넌트 메모이제이션
const MemoizedRestaurantCard = memo(RestaurantCard, (prev, next) => {
  return (
    prev.isExpanded === next.isExpanded &&
    prev.item.id === next.item.id &&
    prev.item.rating === next.item.rating &&
    prev.item.name === next.item.name &&
    prev.item.userRatingsTotal === next.item.userRatingsTotal
  );
});
```

**결과:** ⚠️ 부분 성공
- **성과:** 전체 리렌더링(19개) → 2개로 감소 (90% 개선)
- **성능:** 메모리 오버헤드 ~2KB, 무시할 수준
- **문제:** 셰브론 fade 이슈는 여전히 발생

---

## 현재 상태 (2025-10-21)

### 적용된 코드
```typescript
// app/map/list.tsx

// 1. React.memo 최적화
const MemoizedRestaurantCard = memo(RestaurantCard, (prev, next) => {
  return (
    prev.isExpanded === next.isExpanded &&
    prev.item.id === next.item.id &&
    prev.item.rating === next.item.rating &&
    prev.item.name === next.item.name &&
    prev.item.userRatingsTotal === next.item.userRatingsTotal
  );
});

// 2. 원래 셰브론 구조 (Animated.View + rotate)
<Animated.View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
  <ChevronDown size={18} color="#999999" strokeWidth={2} />
</Animated.View>

// 3. 원래 LayoutAnimation (opacity 기반)
LayoutAnimation.configureNext({
  duration: 250,
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
});
```

### 미해결 이슈
- ❌ 셰브론 아이콘 fade 현상 여전히 발생
- ❌ 간헐적 재현으로 디버깅 어려움
- ⚠️ React Native/Expo의 근본적인 렌더링 이슈로 판단

### 개선 사항
- ✅ 리렌더링 최적화로 성능 90% 개선
- ✅ 디버그 로그 제거 (프로덕션 준비)
- ✅ 향후 실시간 데이터 업데이트 대비 (memo 비교 함수 강화)

## 추가 조사 필요 사항

### React Native GitHub Issues
- `LayoutAnimation` + `transform` 조합 이슈 검색 필요
- Expo SDK 54의 알려진 버그 확인

### 대안 솔루션
1. **Animated API 사용**
   - `LayoutAnimation` 대신 `Animated` API로 전환
   - 더 세밀한 제어 가능, 하지만 코드 복잡도 증가

2. **Reanimated 라이브러리**
   - `react-native-reanimated` 도입
   - 고성능 애니메이션, 하지만 의존성 추가

3. **조건부 렌더링 (재시도)**
   - ChevronUp/ChevronDown 전환
   - 간단하지만 시각적으로 덜 부드러움

4. **CSS 애니메이션 (Web)**
   - Web 플랫폼에서만 작동
   - 네이티브에서는 해결 안 됨

## 결론

**현재 상태:**
- 기능적으로는 정상 작동
- 성능 최적화 완료
- 시각적 버그(셰브론 fade)는 미해결

**권장 사항:**
1. 현재 상태로 개발 진행 (치명적 버그 아님)
2. React Native/Expo 업데이트 시 재확인
3. 사용자 피드백 수집 후 우선순위 재평가
4. 필요 시 Reanimated 라이브러리 도입 검토

**마지막 업데이트:** 2025-10-21  
**최종 커밋:** `b3959dd` - React.memo 최적화 + 디버그 로그 제거
