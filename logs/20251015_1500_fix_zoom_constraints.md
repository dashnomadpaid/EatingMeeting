# Fix Zoom Constraints and Marker Visibility

**Date**: 2025-10-15 15:00  
**Agent**: GitHub Copilot  
**Context**: 전체 보기 버튼 클릭 시에도 일부 마커가 안 보이고, 지도를 충분히 확대할 수 없는 문제 해결

---

## 🔍 Problem Analysis

### 사용자 리포트
1. **"전체보기를 눌러도, 지도 확대시에만 보이는 마커는 보이지 않아"**
2. **"왜 지도를 일정 정도 이상 확대할 수가 없니?"**
3. **"사용자가 보이지 않는 마커에 직접 접근할 수 있는 방법이 없어"**

### 근본 원인

#### 1. **너무 큰 최소 Delta 제약**
```typescript
// ❌ Before
const latitudeDelta = clamp(region.latitudeDelta, 0.005, MAX_LAT_DELTA);
//                                                ↑
//                                         0.005 ≈ 555m
//                                         너무 커서 줌인 불가
```

**문제**: 
- `0.005` delta는 약 **555m** 범위
- 같은 건물/블록 안의 여러 마커를 구분할 수 없음
- 사용자가 특정 마커에 가까이 접근 불가

#### 2. **`fitMarkersRegion` 결과를 과도하게 제약**
```typescript
// ❌ Before
const fittedRegion = fitMarkersRegion(markers);
const constrained = constrainRegion(fittedRegion);
//                    ↑
//               최소 delta 0.005로 강제 적용
//               → 모든 마커를 보기 위해 필요한 delta가 무시됨
```

**문제**:
- `fitMarkersRegion`이 모든 마커를 포함하도록 계산한 region
- `constrainRegion`이 이를 0.005 이상으로 강제
- 결과: 일부 마커가 화면 밖으로 밀려남

---

## ✅ Solution Implemented

### 1. **최소 Delta를 10배 줄임: 0.005 → 0.0005**

```typescript
// ✅ After
function constrainRegion(region: Region): Region {
  // Allow much tighter zoom for detailed viewing (0.0005 ≈ ~55m at equator)
  const latitudeDelta = clamp(region.latitudeDelta, 0.0005, MAX_LAT_DELTA);
  const longitudeDelta = clamp(region.longitudeDelta, 0.0005, MAX_LNG_DELTA);
  // ...
}
```

**효과**:
- `0.0005` delta ≈ **55m** 범위
- 사용자가 개별 마커를 명확히 볼 수 있음
- 같은 블록/건물 내 여러 장소 구분 가능
- **10배 더 깊은 줌인 가능** ✨

### 2. **Fit All Markers 로직 개선 (제약 완화)**

```typescript
// ✅ After: 모든 마커가 보이도록 보장
const handleFitAllMarkers = useCallback(() => {
  const fittedRegion = fitMarkersRegion(markers);
  if (fittedRegion && 'animateToRegion' in mapRef.current) {
    // Apply minimal constraints - only limit max zoom out
    const constrained: Region = {
      latitude: clamp(fittedRegion.latitude, KOREA_BOUNDS.minLat, KOREA_BOUNDS.maxLat),
      longitude: clamp(fittedRegion.longitude, KOREA_BOUNDS.minLng, KOREA_BOUNDS.maxLng),
      latitudeDelta: Math.min(fittedRegion.latitudeDelta, MAX_LAT_DELTA),
      longitudeDelta: Math.min(fittedRegion.longitudeDelta, MAX_LNG_DELTA),
    };
    // No minimum delta constraint here - let fitMarkersRegion decide
    mapRef.current.animateToRegion(constrained, 800);
  }
}, [places, setSelectedGooglePlace]);
```

**변경 사항**:
- `constrainRegion()` 호출 제거 → 최소 delta 제약 없음
- **최대값만 제한** (`Math.min`): 너무 멀리 줌아웃 방지
- **최소값 제한 없음**: `fitMarkersRegion`이 계산한 delta 존중
- 중심점만 한국 경계 내로 제한

### 3. **자동 Fit Effect도 동일하게 개선**

```typescript
// ✅ Auto-fit when places load
useEffect(() => {
  const fittedRegion = fitMarkersRegion(markers);
  if (fittedRegion && 'animateToRegion' in mapRef.current) {
    // Same minimal constraint logic
    const constrained: Region = {
      latitude: clamp(fittedRegion.latitude, KOREA_BOUNDS.minLat, KOREA_BOUNDS.maxLat),
      longitude: clamp(fittedRegion.longitude, KOREA_BOUNDS.minLng, KOREA_BOUNDS.maxLng),
      latitudeDelta: Math.min(fittedRegion.latitudeDelta, MAX_LAT_DELTA),
      longitudeDelta: Math.min(fittedRegion.longitudeDelta, MAX_LNG_DELTA),
    };
    mapRef.current.animateToRegion(constrained, 800);
  }
}, [places, storeSelectedGooglePlace, isCarouselVisible]);
```

---

## 📊 Before vs After Comparison

### Zoom Level Comparison

```
Before (min delta = 0.005):
┌─────────────────────────────┐
│                             │
│    [A] [B] [C]             │  ← 555m 범위, 마커들 뭉개짐
│                             │
│    [D]  [E]                │
│                             │
└─────────────────────────────┘
❌ 더 이상 줌인 불가
❌ 개별 마커 구분 어려움

After (min delta = 0.0005):
┌──────────────┐
│   [A]        │  ← 55m 범위, 마커 명확
│      [B]     │
│         [C]  │  ✨ 10배 더 확대 가능
└──────────────┘
✅ 개별 마커 명확히 구분
✅ 사용자가 원하는 만큼 줌인
```

### Fit All Markers Comparison

```
Before:
fitMarkersRegion(markers) 
  → delta = 0.003 (모든 마커를 포함하려면 필요한 값)
  ↓
constrainRegion()
  → delta = 0.005로 강제 (최소값 제약)
  ↓
일부 마커가 화면 밖으로! ❌

After:
fitMarkersRegion(markers)
  → delta = 0.003
  ↓
Minimal constraint (max만 제한)
  → delta = 0.003 유지 ✅
  ↓
모든 마커가 화면에 보임! ✨
```

---

## 🎯 Key Improvements

### 1. **10배 더 깊은 줌인 가능**
- Before: 최소 555m 범위
- After: 최소 55m 범위
- 효과: 같은 블록/건물 내 여러 마커 구분 가능

### 2. **전체 보기 버튼이 정말로 "전체"를 보여줌**
- Before: 일부 마커가 화면 밖
- After: `fitMarkersRegion`이 계산한 대로 모든 마커 표시

### 3. **사용자 제어권 강화**
- 원하는 만큼 줌인/줌아웃 가능 (합리적 범위 내)
- 핀치 제스처로 자유롭게 탐색
- 보이지 않는 마커에 직접 접근 가능

### 4. **경계 보호 유지**
- 여전히 한국 영역 내로 제한
- 너무 멀리 줌아웃은 방지 (MAX_DELTA)
- 안정적인 UX 유지

---

## 🧮 Delta Values Reference

| Delta Value | Approximate Range | Use Case |
|------------|-------------------|----------|
| 0.0005 (new min) | ~55m | 개별 건물/마커 구분 |
| 0.001 | ~111m | 작은 블록 |
| 0.005 (old min) | ~555m | 동네 수준 |
| 0.01 | ~1.1km | 여러 블록 |
| 0.02 (DEFAULT_DELTA) | ~2.2km | 근처 전체 |
| 0.5+ (MAX_DELTA) | ~55km+ | 광역 뷰 |

---

## 🔧 Technical Details

### Changed Functions

#### 1. `constrainRegion()`
```diff
- const latitudeDelta = clamp(region.latitudeDelta, 0.005, MAX_LAT_DELTA);
+ const latitudeDelta = clamp(region.latitudeDelta, 0.0005, MAX_LAT_DELTA);
```

#### 2. `handleFitAllMarkers()`
```diff
- const constrained = constrainRegion(fittedRegion);
+ const constrained: Region = {
+   latitude: clamp(fittedRegion.latitude, KOREA_BOUNDS.minLat, KOREA_BOUNDS.maxLat),
+   longitude: clamp(fittedRegion.longitude, KOREA_BOUNDS.minLng, KOREA_BOUNDS.maxLng),
+   latitudeDelta: Math.min(fittedRegion.latitudeDelta, MAX_LAT_DELTA),
+   longitudeDelta: Math.min(fittedRegion.longitudeDelta, MAX_LNG_DELTA),
+ };
```

#### 3. Auto-fit effect
```diff
(동일한 패턴 적용)
```

### Constraint Logic Comparison

**Before (strict)**:
```
Input delta → clamp(min=0.005, max) → Always ≥ 0.005
```

**After (flexible)**:
```
For fit all markers:
  Input delta → clamp(min=none, max=MAX) → Respects input
  
For user interaction:
  Input delta → clamp(min=0.0005, max=MAX) → 10x tighter zoom
```

---

## 🧪 Testing Scenarios

### Test 1: 깊은 줌인
1. 마커 선택
2. 핀치 제스처로 계속 줌인
3. **기대**: 0.0005 delta (55m)까지 줌인 가능
4. **확인**: 개별 마커가 명확히 구분됨

### Test 2: 전체 보기 (밀집 마커)
1. 마커들이 좁은 범위에 밀집
2. "전체 보기" 버튼 클릭
3. **기대**: 모든 마커가 화면에 보임 (작은 delta)
4. **확인**: fitMarkersRegion이 계산한 delta 적용

### Test 3: 전체 보기 (분산 마커)
1. 마커들이 넓은 범위에 분산
2. "전체 보기" 버튼 클릭
3. **기대**: 모든 마커가 화면에 보임 (큰 delta)
4. **확인**: MAX_DELTA 제약 내에서 모든 마커 표시

### Test 4: 사용자 줌 아웃
1. 마커 선택 (줌인 상태)
2. 핀치 제스처로 줌아웃
3. **기대**: 부드럽게 줌아웃, MAX_DELTA까지
4. **확인**: 제약 없이 자연스러운 동작

### Test 5: 경계 보호
1. 한국 경계 근처의 마커 선택
2. 지도를 드래그하여 한국 밖으로 이동 시도
3. **기대**: 중심점이 한국 경계 내로 제한됨
4. **확인**: 안정적인 경계 제약 유지

---

## 📝 Code Changes Summary

### Files Modified
- `app/(tabs)/index.tsx` (1126 lines)

### Changes
1. ✅ `constrainRegion()`: 최소 delta 0.005 → 0.0005 (line ~73)
2. ✅ `handleFitAllMarkers()`: 제약 로직 개선, 최소 delta 제거 (line ~637)
3. ✅ Auto-fit effect: 동일한 제약 로직 적용 (line ~507)

### Lines Changed
- Line 73: Minimum delta constraint
- Lines 507-520: Auto-fit effect constraint logic  
- Lines 637-654: Manual fit constraint logic

---

## 💡 Design Rationale

### Q: 왜 0.0005로 설정했나? 더 작게는?
**A**: 
- 0.0005 ≈ 55m: 도보 거리, 개별 건물 구분 가능
- 더 작으면 (0.0001 = 11m): 너무 확대되어 주변 컨텍스트 상실
- 모바일 화면에서 11m는 과도하게 좁음

### Q: MAX_DELTA 제약은 왜 유지?
**A**: 
- 너무 줌아웃하면 (예: 전국 범위) 성능 저하
- 마커들이 점으로 보여 의미 없음
- 합리적 탐색 범위 유지

### Q: Fit all markers에서 왜 최소 delta 제약을 제거했나?
**A**: 
- `fitMarkersRegion`이 이미 1.5배 padding 적용
- 모든 마커를 보여주는 것이 목적
- 최소 delta 제약은 사용자 제어에만 적용하면 충분

### Q: 마커 선택 시에는?
**A**: 
- `CLUSTER_DELTA_THRESHOLD * 0.9` 사용
- 선택된 마커 주변 컨텍스트 제공
- 사용자가 원하면 더 줌인 가능 (핀치 제스처)

---

## 🔄 Related Issues

- **경도 기준 정렬**: 캐러셀 순서가 지리적 위치와 일치
- **Uncontrolled MapView**: 애니메이션 충돌 제거
- **Programmatic scroll tracking**: 캐러셀-마커 동기화
- **Fit all markers**: 모든 마커를 한눈에 볼 수 있는 기능

---

## 📌 User Impact

### Before 😞
```
사용자: "이 근처에 다른 식당도 있을 텐데..."
시스템: *더 이상 줌인 불가*
사용자: "전체 보기를 눌렀는데 일부 마커가 안 보여!"
```

### After 😊
```
사용자: "이 근처에 다른 식당도 있을 텐데..."
시스템: *핀치로 10배 더 줌인 가능*
사용자: "오! 바로 옆에 있네. 전체 보기로 돌아가볼까?"
시스템: *모든 마커가 화면에 표시됨*
사용자: "완벽해!" ✨
```

---

**Status**: ✅ Implemented & Ready for Testing  
**Priority**: High - 직접적인 사용자 경험 개선  
**Next**: Device/Simulator에서 줌인/줌아웃 테스트
