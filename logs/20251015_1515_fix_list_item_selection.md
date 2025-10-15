# Fix List Item Selection - Marker & Card Activation

**Date**: 2025-10-15 15:15  
**Agent**: GitHub Copilot  
**Context**: 목록에서 식당 선택 시 지도로 돌아가면 마커와 카드가 활성화되지 않는 문제 해결

---

## 🔍 Problem Analysis

### 사용자 리포트
> "지도페이지 > 목록 보기 > 목록에서 식당 선택하면 해당 식당에 대한 마커와 카드가 정상적으로 활성화되지 않음. (최소한 ui 단에서 보이지 않음)"

### 증상
1. ❌ 목록에서 식당 선택 → 지도로 전환
2. ❌ 지도가 해당 위치로 이동은 함
3. ❌ 하지만 마커가 하이라이트되지 않음
4. ❌ 캐러셀 카드가 표시되지 않음
5. ❌ 선택된 상태가 UI에 반영되지 않음

### 근본 원인

목록 아이템 클릭 핸들러에서 **불완전한 상태 업데이트**:

```typescript
// ❌ Before
onPress={() => {
  // 1. 지도 애니메이션만 실행
  mapRef.current.animateToRegion(nextRegion, 500);
  
  // 2. 스토어 업데이트
  setSelectedGooglePlace(item);
  
  // 3. 목록 숨기기
  setShowList(false);
  
  // ❌ 캐러셀 표시 안 함
  // ❌ activeIndex 설정 안 함
  // ❌ 프로그래매틱 스크롤 플래그 설정 안 함
}}
```

**결과**:
- `storeSelectedGooglePlace`는 업데이트됨
- 하지만 `isCarouselVisible = false` → 캐러셀 안 보임
- `activeIndex = -1` → 어떤 카드도 활성화 안 됨
- 마커는 `storeSelectedGooglePlace?.id`로만 체크 → 하이라이트되지만 `activeIndex`도 필요
- 캐러셀이 안 보이므로 카드 선택 상태가 UI에 반영 안 됨

---

## ✅ Solution Implemented

### `handleMarkerPress`와 동일한 로직 적용

목록 아이템 선택도 마커 선택과 **동일한 플로우**로 처리:

```typescript
// ✅ After
onPress={() => {
  console.log('[ListItem] Selected:', item.id, item.name);
  
  // 1. Find index for carousel synchronization
  const index = places.findIndex((place) => place.id === item.id);
  console.log('[ListItem] Place index:', index, '/', places.length);
  
  if (index === -1) {
    console.warn('[ListItem] Place not found in list!');
    return;
  }

  // 2. Calculate target region
  const currentDelta = region
    ? Math.min(region.latitudeDelta, CLUSTER_DELTA_THRESHOLD * 0.9)
    : DEFAULT_DELTA;
  const nextRegion = constrainRegion({
    latitude: item.lat,
    longitude: item.lng,
    latitudeDelta: currentDelta,
    longitudeDelta: currentDelta,
  });
  
  // 3. Update ALL UI states to activate marker and card
  setShowList(false);                                    // ✅ Hide list
  setCarouselVisible(true);                              // ✅ Show carousel
  pendingProgrammaticScrollIndexRef.current = index;     // ✅ Set pending scroll
  markProgrammaticCarouselScroll(600);                   // ✅ Set scroll flag
  setActiveIndex(index);                                 // ✅ Activate card index
  setSelectedGooglePlace(item);                          // ✅ Update store
  
  // 4. Animate map to selected place
  if (mapRef.current && 'animateToRegion' in mapRef.current) {
    console.log('[ListItem] Animating to:', item.name);
    mapRef.current.animateToRegion(nextRegion, 500);
  }
  
  // 5. Scroll carousel to selected card with retry logic
  setTimeout(() => {
    if (pendingProgrammaticScrollIndexRef.current !== index) {
      return;
    }
    try {
      console.log('[ListItem] Scrolling to index:', index);
      if (attemptProgrammaticScrollToIndex(index, true)) {
        pendingProgrammaticScrollIndexRef.current = null;
      }
    } catch (error) {
      console.warn('[ListItem] Scroll failed, retrying...', error);
      setTimeout(() => {
        if (pendingProgrammaticScrollIndexRef.current !== index) {
          return;
        }
        try {
          if (attemptProgrammaticScrollToIndex(index, false)) {
            pendingProgrammaticScrollIndexRef.current = null;
          }
        } catch (e) {
          pendingProgrammaticScrollIndexRef.current = null;
          console.error('[ListItem] Second scroll attempt failed', e);
        }
      }, 120);
    }
  }, 50);
}}
```

---

## 🎯 Key Changes

### 1. **Index 계산 추가**
```typescript
const index = places.findIndex((place) => place.id === item.id);
if (index === -1) {
  console.warn('[ListItem] Place not found in list!');
  return;
}
```
- 선택한 place의 인덱스를 찾음
- 캐러셀 스크롤과 activeIndex 설정에 필수

### 2. **캐러셀 활성화**
```typescript
setCarouselVisible(true);  // ✅ 추가됨
```
- 목록에서 선택하면 캐러셀이 나타남
- 선택된 카드가 표시됨

### 3. **ActiveIndex 설정**
```typescript
setActiveIndex(index);  // ✅ 추가됨
```
- 캐러셀에서 올바른 카드가 활성화됨
- 마커 이중 하이라이트 조건 충족 (`isActive || isActiveByIndex`)

### 4. **프로그래매틱 스크롤 관리**
```typescript
pendingProgrammaticScrollIndexRef.current = index;
markProgrammaticCarouselScroll(600);
```
- 캐러셀이 올바른 카드로 스크롤됨
- viewability 콜백이 간섭하지 않음

### 5. **캐러셀 스크롤 로직**
```typescript
setTimeout(() => {
  attemptProgrammaticScrollToIndex(index, true);
  // Retry logic...
}, 50);
```
- `handleMarkerPress`와 동일한 재시도 로직
- FlatList의 layout 준비 시간 고려

---

## 📊 Before vs After

### Before (문제 상황)

```
목록에서 "A 식당" 선택
  ↓
setSelectedGooglePlace(A)  ← 스토어만 업데이트
  ↓
setShowList(false)  ← 목록 숨김
  ↓
mapRef.animateToRegion()  ← 지도 이동
  ↓
❌ 캐러셀 안 보임 (isCarouselVisible = false)
❌ activeIndex = -1 (카드 활성화 안 됨)
❌ 마커는 일부만 하이라이트 (storeSelectedGooglePlace만 체크)
❌ UI에 선택 상태 반영 안 됨
```

### After (해결 후)

```
목록에서 "A 식당" 선택
  ↓
index 계산 (A의 위치 파악)
  ↓
State 업데이트 (동시에):
  - setShowList(false)           ✅ 목록 숨김
  - setCarouselVisible(true)     ✅ 캐러셀 표시
  - setActiveIndex(index)        ✅ 카드 활성화
  - setSelectedGooglePlace(A)    ✅ 스토어 업데이트
  - pendingScroll = index        ✅ 스크롤 대기
  ↓
mapRef.animateToRegion(500ms)   ✅ 지도 부드럽게 이동
  ↓
setTimeout 50ms
  ↓
attemptProgrammaticScrollToIndex()  ✅ 캐러셀 스크롤
  ↓
✅ 마커 하이라이트 (storeSelectedGooglePlace + activeIndex)
✅ 캐러셀 카드 활성화 및 표시
✅ 모든 UI 상태 동기화
```

---

## 🔄 Flow Comparison

### Marker Press (기존 - 정상 동작)
```typescript
handleMarkerPress(place) {
  index = findIndex(place)
  setCarouselVisible(true)     ✅
  setActiveIndex(index)         ✅
  setSelectedGooglePlace(place) ✅
  markProgrammaticScroll()      ✅
  animateToRegion()             ✅
  scrollToIndex()               ✅
}
```

### List Item Press (Before - 문제)
```typescript
onPress() {
  setSelectedGooglePlace(item) ✅
  setShowList(false)           ✅
  animateToRegion()            ✅
  // ❌ 나머지 상태 업데이트 누락
}
```

### List Item Press (After - 수정)
```typescript
onPress() {
  index = findIndex(item)       ✅
  setCarouselVisible(true)      ✅ 추가
  setActiveIndex(index)         ✅ 추가
  setSelectedGooglePlace(item)  ✅
  markProgrammaticScroll()      ✅ 추가
  setShowList(false)            ✅
  animateToRegion()             ✅
  scrollToIndex()               ✅ 추가
}
// → handleMarkerPress와 동일한 로직
```

---

## 🎨 UI State Synchronization

선택된 마커/카드는 **3가지 상태**로 결정됨:

### 1. **Store State** (`storeSelectedGooglePlace`)
- Zustand store의 전역 상태
- `setSelectedGooglePlace()`로 업데이트

### 2. **Local Index** (`activeIndex`)
- 캐러셀의 현재 활성 인덱스
- `setActiveIndex()`로 업데이트

### 3. **Carousel Visibility** (`isCarouselVisible`)
- 캐러셀이 화면에 표시되는지 여부
- `setCarouselVisible()`로 업데이트

**마커 하이라이트 조건**:
```typescript
const isActive = storeSelectedGooglePlace?.id === place.id;
const isActiveByIndex = idx === activeIndex;
const shouldHighlight = isActive || isActiveByIndex;  // 둘 중 하나라도 true면 하이라이트
```

**목록 선택 시 모든 조건 충족**:
- ✅ `storeSelectedGooglePlace.id === item.id` (store 업데이트)
- ✅ `activeIndex === index` (index 설정)
- ✅ `isCarouselVisible === true` (캐러셀 표시)
- → **완전한 활성화 상태** ✨

---

## 🧪 Testing Scenarios

### Test 1: 목록에서 첫 번째 식당 선택
1. "목록 보기" 클릭
2. 첫 번째 식당 선택
3. **기대**: 지도로 전환, 해당 마커 하이라이트, 캐러셀 표시, 첫 번째 카드 활성화
4. **확인**: 모든 UI 요소가 동기화됨

### Test 2: 목록에서 중간 식당 선택
1. "목록 보기" 클릭
2. 중간 식당 선택
3. **기대**: 지도로 전환, 해당 마커 하이라이트, 캐러셀의 중간 카드 표시
4. **확인**: 캐러셀이 올바른 위치로 스크롤됨

### Test 3: 목록에서 마지막 식당 선택
1. "목록 보기" 클릭
2. 마지막 식당 선택
3. **기대**: 지도로 전환, 해당 마커 하이라이트, 캐러셀의 마지막 카드 표시
4. **확인**: 스크롤이 끝까지 이동함

### Test 4: 목록 → 선택 → 다른 마커 클릭
1. 목록에서 A 식당 선택 → 캐러셀 표시
2. 지도에서 B 마커 클릭
3. **기대**: 캐러셀이 B 카드로 스크롤
4. **확인**: 상태 전환이 부드러움

### Test 5: 목록 → 선택 → 캐러셀 스와이프
1. 목록에서 A 식당 선택
2. 캐러셀을 스와이프하여 B 카드로 이동
3. **기대**: 지도가 B 위치로 이동, B 마커 하이라이트
4. **확인**: viewability 콜백이 정상 작동

---

## 📝 Code Changes Summary

### Files Modified
- `app/(tabs)/index.tsx` (1126 → 1179 lines)

### Changes
**List item onPress handler** (line ~873):
- ✅ Added: Index calculation with `findIndex()`
- ✅ Added: Early return if place not found
- ✅ Added: `setCarouselVisible(true)`
- ✅ Added: `setActiveIndex(index)`
- ✅ Added: `pendingProgrammaticScrollIndexRef.current = index`
- ✅ Added: `markProgrammaticCarouselScroll(600)`
- ✅ Added: Carousel scroll logic with retry (50ms delay)
- ✅ Added: Console logs for debugging
- 📝 Maintained: `setSelectedGooglePlace(item)`
- 📝 Maintained: `setShowList(false)`
- 📝 Maintained: `animateToRegion()`

### Lines Added: ~53
### Logic: Now identical to `handleMarkerPress`

---

## 💡 Design Decisions

### Q: 왜 `handleMarkerPress`와 동일한 로직을 사용?
**A**: 
- 마커 선택이든 목록 선택이든 **최종 결과는 동일**해야 함
- 코드 중복보다 **일관된 UX**가 더 중요
- 디버깅과 유지보수가 쉬움

### Q: 왜 인라인 함수로 구현했나? useCallback은?
**A**:
- `renderItem`에서만 사용되는 단일 핸들러
- `attemptProgrammaticScrollToIndex`, `markProgrammaticCarouselScroll` 등 여러 함수에 이미 접근 가능
- 추가 useCallback 래핑은 불필요한 복잡성
- 성능 영향 없음 (FlatList는 keyExtractor로 최적화)

### Q: 50ms delay는 왜 필요?
**A**:
- 상태 업데이트 (setCarouselVisible, setActiveIndex) → React render
- FlatList layout calculation → 완료 필요
- 너무 빠르게 `scrollToIndex` 호출 → 에러
- 50ms는 충분한 시간이면서도 사용자가 느끼지 못함

### Q: Retry logic이 필요한 이유?
**A**:
- FlatList가 아직 마운트되지 않았거나
- 대상 인덱스의 아이템이 아직 레이아웃되지 않았을 때
- `scrollToIndex` 실패 가능
- 120ms 후 재시도 (애니메이션 없이) → 높은 성공률

---

## 🔄 Related Features

이번 수정으로 다음 기능들이 **완전히 통합**됨:

1. **마커 클릭** → 캐러셀 표시 + 카드 활성화 ✅
2. **목록 선택** → 캐러셀 표시 + 카드 활성화 ✅ (이번 수정)
3. **캐러셀 스와이프** → 마커 하이라이트 + 지도 이동 ✅
4. **전체 보기** → 모든 마커 표시 + 캐러셀 숨김 ✅
5. **경도 정렬** → 지리적 순서와 캐러셀 순서 일치 ✅

**일관된 상태 관리**:
- 모든 진입점(마커, 목록, 캐러셀)에서 동일한 상태 업데이트
- 프로그래매틱 스크롤 플래그로 충돌 방지
- 디버그 로그로 추적 가능

---

## 📌 User Impact

### Before 😞
```
사용자: "목록에서 이 식당 선택했는데..."
시스템: *지도로 전환, 위치 이동*
사용자: "어? 마커가 안 보이는데? 선택된 게 맞나?"
시스템: *캐러셀도 안 보임*
사용자: "다시 목록 들어가서 확인해야 하나?" 😕
```

### After 😊
```
사용자: "목록에서 이 식당 선택!"
시스템: *지도로 전환 + 마커 하이라이트 + 캐러셀 표시*
사용자: "오! 바로 보이네. 옆 식당도 볼까?"
시스템: *캐러셀 스와이프 가능*
사용자: "완벽해!" ✨
```

---

## 🎯 Summary

**핵심 변경**: 목록 아이템 선택 시 `handleMarkerPress`와 동일한 로직 적용

**결과**:
- ✅ 마커 하이라이트 활성화
- ✅ 캐러셀 표시 및 올바른 카드 선택
- ✅ 지도 애니메이션과 동기화
- ✅ 일관된 UX (마커/목록/캐러셀 모두 동일한 동작)
- ✅ 프로그래매틱 스크롤 충돌 방지

**라인 변경**: +53 lines (logic improvement, no breaking changes)

---

**Status**: ✅ Implemented & Ready for Testing  
**Priority**: High - 주요 사용자 플로우 수정  
**Next**: Device/Simulator에서 목록 → 선택 → 지도 전환 테스트
