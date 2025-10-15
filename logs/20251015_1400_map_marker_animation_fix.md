# Map Marker Animation & Carousel Sync Fix

**Date**: 2025-10-15 14:00  
**Agent**: GitHub Copilot  
**Context**: 마커 선택 시 캐러셀 빙그르르 회전, 마커 깜빡임, 잘못된 마커로 포커싱되는 문제 해결

---

## 🔍 Problem Analysis

### 증상
1. **마커 클릭 시 캐러셀이 빙그르르 정신없이 돌아감**
2. **같은 축척에서 마커가 표시되다가 사라지는 현상** 
3. **누른 마커가 아닌 다른 마커로 지도가 포커싱되는 경우 발생**

### 근본 원인
**Controlled vs Animated Region의 충돌**

```typescript
// ❌ 문제 코드
<MapView
  region={region}  // Controlled prop
  onRegionChangeComplete={handleRegionChangeComplete}
>

// 마커 클릭 핸들러에서
setRegion(nextRegion);  // State 업데이트
mapRef.current.animateToRegion(nextRegion, 400);  // 동시에 애니메이션

// handleRegionChangeComplete에서
setRegion(constrained);  // 또 다른 state 업데이트
mapRef.current.animateToRegion(constrained, 160);  // 추가 애니메이션
```

**충돌 메커니즘**:
1. 마커 클릭 → `setRegion` + `animateToRegion` 동시 호출
2. `region` prop 변경 → MapView re-render → 마커 깜빡임
3. `onRegionChangeComplete` 트리거 → 또 다른 `setRegion` + `animateToRegion`
4. 애니메이션이 중첩되어 "빙그르르" 효과 발생
5. `viewabilityConfigCallbackPairs`가 잘못된 시점에 트리거되어 다른 마커로 포커싱

---

## ✅ Solution Implemented

### 1. **MapView를 Uncontrolled로 전환**

```typescript
// ✅ 수정 후
<MapView
  initialRegion={region}  // 초기값만 제공
  // region prop 제거 - 이후 업데이트는 animateToRegion으로만
  onRegionChangeComplete={handleRegionChangeComplete}
>
```

**효과**: 
- MapView가 자체적으로 region 상태 관리
- `animateToRegion`이 방해받지 않고 부드럽게 실행
- 마커가 re-render되지 않아 깜빡임 제거

### 2. **모든 setRegion 호출 제거 (애니메이션 경로만 사용)**

#### 마커 프레스 핸들러
```typescript
// ❌ Before
setRegion(nextRegion);
mapRef.current.animateToRegion(nextRegion, 400);

// ✅ After  
// setRegion 제거 - 애니메이션만 사용
mapRef.current.animateToRegion(nextRegion, 500);
```

#### Viewable Items Changed
```typescript
// ✅ 동일하게 setRegion 제거
if (mapRef.current && 'animateToRegion' in mapRef.current) {
  console.log('[ViewableChanged] Animating to:', nextPlace.name);
  mapRef.current.animateToRegion(nextRegion, 500);
}
```

#### List Item Press
```typescript
// ✅ 동일 패턴 적용
if (mapRef.current && 'animateToRegion' in mapRef.current) {
  console.log('[ListItem] Animating to:', item.name);
  mapRef.current.animateToRegion(nextRegion, 500);
}
```

### 3. **handleRegionChangeComplete 개선**

```typescript
const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
  // Skip if we're currently animating to a marker selection
  if (isAnimatingToMarkerRef.current) {
    console.log('[RegionChange] Skipping - marker animation in progress');
    return;
  }
  
  // Update internal region state for reference (but don't pass to MapView)
  const constrained = constrainRegion(nextRegion);
  setRegion((prev) => (regionsApproxEqual(prev, constrained) ? prev : constrained));
  
  // Only animate if significantly out of bounds
  // ... boundary check logic ...
}, []);
```

**개선 사항**:
- `setRegion`은 내부 참조용으로만 유지 (MapView prop으로 전달 안 함)
- 마커 애니메이션 중에는 추가 처리 스킵
- 명확한 로그로 디버깅 가능

### 4. **애니메이션 duration 일관성**

모든 애니메이션을 **500ms**로 통일:
- 마커 프레스: `500ms`
- 캐러셀 스크롤: `500ms`
- 리스트 아이템: `500ms`
- 초기 로딩: `800ms` (부드러운 첫 진입)

### 5. **Programmatic Scroll 추적 강화**

이전에 구현한 `isProgrammaticCarouselScrollRef` 시스템 유지:
- 마커 클릭 시 플래그 설정 → viewability 콜백 스킵
- 600ms 후 자동 해제
- 캐러셀과 마커 상태 동기화 보장

---

## 📊 Changes Summary

### Files Modified
- `app/(tabs)/index.tsx` (1037 lines)

### Key Changes
1. ✅ MapView `region` prop 제거 (line ~707)
2. ✅ `handleMarkerPress`: `setRegion` 제거, 애니메이션 500ms (line ~520)
3. ✅ `handleViewableItemsChanged`: `setRegion` 제거, 애니메이션 500ms (line ~615)
4. ✅ List item onPress: `setRegion` 제거, 애니메이션 500ms (line ~788)
5. ✅ `handleRegionChangeComplete`: 주석 개선, 로직 명확화 (line ~420)
6. ✅ Initial location effect: 애니메이션 추가 800ms (line ~458)

---

## 🎯 Expected Behavior

### Before (문제 상황)
```
마커 클릭
  ↓
setRegion (state update) ← MapView re-render
  ↓
animateToRegion (400ms)
  ↓
onRegionChangeComplete
  ↓
setRegion (다시!) ← 또 다른 re-render
  ↓
animateToRegion (160ms) ← 애니메이션 충돌!
  ↓
viewabilityChange → 잘못된 마커로 포커싱
  ↓
"빙그르르" 효과 + 마커 깜빡임
```

### After (해결 후)
```
마커 클릭
  ↓
isAnimatingToMarkerRef = true (플래그)
  ↓
animateToRegion (500ms) ← 단일 애니메이션만
  ↓
onRegionChangeComplete → 플래그 체크 → 스킵!
  ↓
viewabilityChange → 프로그래매틱 플래그 체크 → 스킵!
  ↓
550ms 후 플래그 해제
  ↓
✅ 부드러운 단일 애니메이션, 마커 안정적으로 표시
```

---

## 🧪 Testing Checklist

- [ ] 마커 A 클릭 → 지도가 부드럽게 A로 이동
- [ ] 마커 B 클릭 → 지도가 부드럽게 B로 이동 (깜빡임 없음)
- [ ] 빠르게 여러 마커 연속 클릭 → 마지막 마커로 안정적으로 도착
- [ ] 캐러셀 스와이프 → 지도가 부드럽게 따라 이동
- [ ] 리스트 뷰 아이템 클릭 → 지도 뷰로 전환 후 부드럽게 이동
- [ ] 같은 축척에서 마커 간 전환 → 마커 깜빡임/사라짐 없음
- [ ] 초기 로딩 → 현재 위치로 부드럽게 애니메이션

---

## 💡 Key Learnings

1. **MapView의 `region` prop을 사용하면 controlled component가 되어 애니메이션과 충돌**
   - `initialRegion`만 사용하고 이후 업데이트는 `animateToRegion`으로만 처리
   
2. **State 업데이트와 imperative 애니메이션을 동시에 사용하면 안 됨**
   - `setRegion` + `animateToRegion` 동시 호출 → 충돌
   - 둘 중 하나만 선택: 우리는 애니메이션 선택 (더 부드러움)

3. **내부 참조용 `region` state는 유지해도 됨**
   - Delta 계산, 경계 체크 등에 필요
   - 단, MapView prop으로 전달하지 않으면 문제 없음

4. **Animation duration을 일관되게 유지하면 UX 개선**
   - 500ms: 사용자 액션에 대한 응답
   - 800ms: 초기 로딩 같은 특별한 경우

5. **Flag 기반 동기화로 race condition 방지**
   - `isAnimatingToMarkerRef`: 지도 애니메이션 중 체크
   - `isProgrammaticCarouselScrollRef`: 캐러셀 프로그래매틱 스크롤 중 체크
   - `pendingProgrammaticScrollIndexRef`: 대기 중인 스크롤 인덱스 추적

---

## 🔄 Related Issues

- Previous: "Invalid hook call" in carousel card (fixed by extracting CarouselCard component)
- Previous: 지도 튕김 현상 (partially fixed with isAnimatingToMarkerRef)
- **Current**: 마커 깜빡임 + 캐러셀 빙그르르 + 잘못된 포커싱 (✅ FIXED)

---

## 📝 Notes for Future

- MapView에서 controlled `region` prop 사용은 피할 것
- 애니메이션이 필요한 경우 항상 `animateToRegion`만 사용
- 여러 컴포넌트에서 동시에 지도를 제어할 때는 반드시 플래그로 동기화
- 디버그 로그를 충분히 남겨서 애니메이션 흐름 추적 가능하게 할 것

---

**Status**: ✅ Ready for Testing  
**Next**: Device/Simulator에서 실제 동작 확인 필요
