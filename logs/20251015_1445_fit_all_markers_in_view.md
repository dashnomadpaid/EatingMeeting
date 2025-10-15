# Fit All Markers in Map View

**Date**: 2025-10-15 14:45  
**Agent**: GitHub Copilot  
**Context**: 지도 축척/포커싱에 따라 일부 마커가 안 보이는 문제 해결

---

## 🔍 Problem Analysis

### 증상
1. **특정 마커를 선택하면 지도가 줌인되어 다른 마커들이 화면 밖으로 사라짐**
2. **지도 축척(zoom level)에 따라 일부 마커만 보이고 나머지는 안 보임**
3. **모든 주변 식당을 한눈에 볼 수 있는 방법이 없음**

### 사용자 요구사항
> "주변 모든 식당이 보이게는 구현 못해? 특정 카드가 선택이 되어도, 특정 상황에서 마커가 안 보이는 경우가 있어서..."

### 근본 원인
- MapView가 **초기 region**만 설정되고, 이후 마커 선택 시 해당 위치로만 줌인
- 모든 마커를 포함하는 viewport를 자동으로 계산하는 로직이 없음
- 사용자가 전체 마커를 보고 싶어도 수동으로 줌아웃해야 함

---

## ✅ Solution Implemented

### 1. **`fitMarkersRegion` 함수 활용**

이미 `lib/maps.ts`에 존재하는 함수를 import:

```typescript
import { fitMarkersRegion } from '@/lib/maps';
```

이 함수는 모든 마커의 좌표를 받아 최소 bounding box + 여유 공간을 계산:

```typescript
export function fitMarkersRegion(markers: MapMarker[]): Region | null {
  if (markers.length === 0) return null;

  // Calculate min/max lat/lng
  let minLat = markers[0].coordinate.latitude;
  let maxLat = markers[0].coordinate.latitude;
  let minLng = markers[0].coordinate.longitude;
  let maxLng = markers[0].coordinate.longitude;

  markers.forEach((marker) => {
    minLat = Math.min(minLat, marker.coordinate.latitude);
    maxLat = Math.max(maxLat, marker.coordinate.latitude);
    minLng = Math.min(minLng, marker.coordinate.longitude);
    maxLng = Math.max(maxLng, marker.coordinate.longitude);
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = (maxLat - minLat) * 1.5;  // 1.5x padding
  const lngDelta = (maxLng - minLng) * 1.5;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, 0.01),
    longitudeDelta: Math.max(lngDelta, 0.01),
  };
}
```

### 2. **자동으로 모든 마커 표시 (places 로드 시)**

```typescript
// Fit all markers in view when places change (unless a specific marker is selected)
useEffect(() => {
  if (places.length === 0 || !mapRef.current || isAnimatingToMarkerRef.current) {
    return;
  }
  
  // Don't auto-fit if user has selected a specific place
  if (storeSelectedGooglePlace && isCarouselVisible) {
    return;
  }
  
  const markers = places.map(place => ({
    id: place.id,
    coordinate: { latitude: place.lat, longitude: place.lng },
    title: place.name,
  }));
  
  const fittedRegion = fitMarkersRegion(markers);
  if (fittedRegion && 'animateToRegion' in mapRef.current) {
    const constrained = constrainRegion(fittedRegion);
    console.log('[Places] Fitting all markers in view:', places.length, 'places');
    setTimeout(() => {
      if (mapRef.current && 'animateToRegion' in mapRef.current) {
        mapRef.current.animateToRegion(constrained, 800);
      }
    }, 300);
  }
}, [places, storeSelectedGooglePlace, isCarouselVisible]);
```

**동작 조건**:
- ✅ Places가 새로 로드될 때
- ✅ 마커가 선택되지 않은 상태일 때
- ❌ 특정 마커가 선택되어 캐러셀이 보이는 동안은 스킵 (사용자가 선택한 위치 유지)

### 3. **수동 "전체 보기" 버튼 추가**

```typescript
const handleFitAllMarkers = useCallback(() => {
  if (places.length === 0 || !mapRef.current) return;
  
  const markers = places.map(place => ({
    id: place.id,
    coordinate: { latitude: place.lat, longitude: place.lng },
    title: place.name,
  }));
  
  const fittedRegion = fitMarkersRegion(markers);
  if (fittedRegion && 'animateToRegion' in mapRef.current) {
    const constrained = constrainRegion(fittedRegion);
    console.log('[FitAllMarkers] Showing all', places.length, 'markers');
    setCarouselVisible(false);
    setSelectedGooglePlace(null);
    mapRef.current.animateToRegion(constrained, 800);
  }
}, [places, setSelectedGooglePlace]);
```

**동작**:
- 모든 마커를 포함하는 region으로 애니메이션
- 캐러셀 숨기기
- 선택된 마커 초기화
- 800ms 부드러운 애니메이션

### 4. **UI 개선**

```tsx
{!showList ? (
  <View style={[styles.topControls, { top: insets.top + 12 }]}>
    <TouchableOpacity style={styles.listButton} onPress={() => setShowList(true)}>
      <Text style={styles.listButtonText}>목록 보기</Text>
    </TouchableOpacity>
    {places.length > 1 && (
      <TouchableOpacity 
        style={[styles.listButton, { marginLeft: 8 }]} 
        onPress={handleFitAllMarkers}
      >
        <Text style={styles.listButtonText}>전체 보기</Text>
      </TouchableOpacity>
    )}
  </View>
) : null}
```

**버튼 표시 조건**:
- 목록 뷰가 아닐 때
- 마커가 2개 이상 있을 때

**스타일 수정**:
```typescript
topControls: {
  position: 'absolute',
  top: 16,
  right: 16,
  flexDirection: 'row',  // 추가: 버튼을 가로로 배치
  alignItems: 'center',   // 추가: 수직 정렬
},
```

---

## 📊 User Flow Examples

### Scenario 1: 초기 로딩
```
앱 시작
  ↓
현재 위치 획득
  ↓
주변 places 로드 (경도 순 정렬)
  ↓
모든 마커를 포함하는 region 계산
  ↓
800ms 애니메이션으로 모든 마커 표시 ✨
```

### Scenario 2: 마커 선택 후 전체 보기
```
특정 마커 클릭
  ↓
지도가 해당 마커로 줌인 (500ms)
  ↓
캐러셀 표시
  ↓
사용자: "다른 마커도 보고 싶다"
  ↓
"전체 보기" 버튼 클릭
  ↓
모든 마커를 포함하는 region으로 애니메이션 (800ms)
  ↓
캐러셀 숨김
  ↓
모든 마커를 한눈에 볼 수 있음 ✨
```

### Scenario 3: 목록에서 선택 후
```
"목록 보기" 클릭
  ↓
리스트 뷰 표시
  ↓
특정 식당 선택
  ↓
지도 뷰로 전환 + 해당 위치로 애니메이션
  ↓
사용자: "주변에 다른 곳은?"
  ↓
"전체 보기" 버튼 클릭
  ↓
모든 마커 표시 ✨
```

---

## 🎯 Key Features

### 1. **자동 Fit (스마트 동작)**
- Places 로드 시 자동으로 모든 마커 표시
- 단, 사용자가 특정 마커를 선택한 경우는 제외 (의도 존중)
- 마커 애니메이션 중에는 개입 안 함 (충돌 방지)

### 2. **수동 Fit (명시적 컨트롤)**
- "전체 보기" 버튼으로 언제든지 전체 마커 표시
- 선택 상태 초기화 → 전체 뷰로 리셋
- 800ms 부드러운 애니메이션

### 3. **경계 제약 (안전장치)**
- `constrainRegion`으로 한국 경계 내로 제한
- 너무 작은 delta 방지 (최소 0.01)
- 너무 큰 delta 방지 (MAX_LAT_DELTA, MAX_LNG_DELTA)

### 4. **애니메이션 일관성**
- 모든 fit 동작: 800ms (여유있는 줌아웃)
- 마커 선택: 500ms (빠른 줌인)
- 초기 로딩: 800ms (부드러운 첫 진입)

---

## 🧪 Testing Checklist

- [ ] **초기 로딩**: 모든 마커가 화면에 보이는가?
- [ ] **마커 선택**: 특정 마커 클릭 시 해당 위치로 줌인되는가?
- [ ] **전체 보기 버튼**: 클릭 시 모든 마커가 다시 보이는가?
- [ ] **캐러셀 표시 중**: 전체 보기 버튼 클릭 시 캐러셀이 사라지는가?
- [ ] **마커 1개**: 전체 보기 버튼이 숨겨지는가?
- [ ] **목록 뷰**: "전체 보기" 버튼이 보이지 않는가?
- [ ] **빠른 연속 클릭**: 전체 보기 → 마커 선택 → 전체 보기 동작이 안정적인가?
- [ ] **경계 제약**: 한국 밖으로 나가지 않는가?
- [ ] **애니메이션 충돌**: 마커 클릭 중 자동 fit이 개입하지 않는가?

---

## 📝 Code Changes Summary

### Files Modified
- `app/(tabs)/index.tsx` (1110 lines)

### Key Changes
1. ✅ Import `fitMarkersRegion` from `@/lib/maps`
2. ✅ Add auto-fit effect when places load (line ~490)
3. ✅ Add `handleFitAllMarkers` callback (line ~640)
4. ✅ Add "전체 보기" button in UI (line ~805)
5. ✅ Update `topControls` style to flex row (line ~943)

### New Functions
- `handleFitAllMarkers()`: 수동으로 모든 마커를 보여주는 핸들러

### New Effects
- Auto-fit effect: places가 변경되고 선택된 마커가 없을 때 자동 실행

---

## 💡 Design Decisions

### Q: 왜 마커 선택 중에는 자동 fit을 스킵하나?
**A**: 사용자가 특정 마커를 선택했다는 것은 그 위치에 관심이 있다는 의도. 자동으로 줌아웃하면 UX 방해.

### Q: 왜 "전체 보기" 버튼이 필요한가? 자동으로만 하면 안 되나?
**A**: 사용자가 명시적으로 전체 뷰를 보고 싶을 때 사용. 예: 마커 선택 후 주변 다른 옵션 탐색.

### Q: 왜 1.5배 padding을 주나?
**A**: 마커가 화면 가장자리에 딱 붙으면 답답함. 여유 공간으로 더 나은 UX.

### Q: 왜 800ms 애니메이션인가?
**A**: 
- 500ms (마커 선택): 사용자 액션에 빠른 반응
- 800ms (전체 보기): 여러 마커를 포함하는 큰 줌아웃이므로 더 부드럽게

---

## 🔄 Related Features

- **경도 기준 정렬** (이전 개선): 캐러셀 순서가 지리적 위치와 일치
- **Uncontrolled MapView** (이전 개선): 애니메이션이 방해받지 않음
- **Programmatic scroll tracking** (이전 개선): 캐러셀-마커 동기화

이제 이 기능들이 함께 작동하여:
1. 모든 마커가 화면에 보임 ✅
2. 경도 순으로 정렬되어 직관적 ✅
3. 부드러운 애니메이션 ✅
4. 사용자가 명시적으로 컨트롤 가능 ✅

---

## 📌 Future Enhancements

1. **클러스터링**: 마커가 너무 많을 때 그룹화
2. **필터별 fit**: 카테고리 필터 적용 시 해당 마커들만 fit
3. **현재 위치 포함**: "내 위치 + 모든 마커" 를 포함하는 fit
4. **애니메이션 인터럽트**: 진행 중인 애니메이션을 부드럽게 중단하고 새 애니메이션 시작

---

**Status**: ✅ Implemented & Ready for Testing  
**Next**: Device/Simulator에서 실제 동작 확인
