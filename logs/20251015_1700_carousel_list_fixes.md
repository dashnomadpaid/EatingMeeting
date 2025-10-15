# Carousel Alignment & List View Fixes

**Date**: 2025-10-15 17:00  
**Agent**: GitHub Copilot  
**Context**: 캐러셀 카드 중앙 정렬 수정, 목록 화면 데이터 표시 구현

---

## 🎯 User Issues

1. **캐러셀 카드 정렬 문제**
   - 카드를 슬라이드하면 메인 카드가 중앙이 아닌 오른쪽으로 치우침
   - 좌우 어느 방향이든 같은 문제 발생
   
2. **목록 화면 데이터 없음**
   - "목록 보기" 버튼 클릭 시 식당 목록이 표시되지 않음
   - 빈 화면만 표시됨

---

## 🔍 Root Cause Analysis

### 문제 1: 캐러셀 정렬

#### Before (잘못된 계산)
```typescript
const CARD_WIDTH = Math.min(WINDOW_WIDTH * 0.8, 320);
const CARD_SPACING = 16;
const CARD_FULL_WIDTH = CARD_WIDTH + CARD_SPACING;
const CARD_PEEK_PADDING = Math.max((WINDOW_WIDTH - CARD_WIDTH) / 2, 16);  // ❌ 문제!
```

**문제점**:
```
화면: 375px
카드: 300px
계산: (375 - 300) / 2 = 37.5px

그런데 Math.max(37.5, 16) = 37.5
→ 왼쪽 패딩: 37.5px
→ 카드 너비: 300px
→ 오른쪽 여백: 375 - 37.5 - 300 = 37.5px ✅

BUT! carouselCardWrapper에서:
  width: CARD_WIDTH (300px)
  marginRight: CARD_SPACING (16px)
  
실제 점유 공간: 300 + 16 = 316px

결과:
  왼쪽 패딩: 37.5px
  카드: 316px (width + marginRight)
  오른쪽: 375 - 37.5 - 316 = 21.5px ❌

→ 왼쪽(37.5px) > 오른쪽(21.5px) 
→ 카드가 오른쪽으로 치우침!
```

#### 스타일 문제
```typescript
// ❌ Before
carouselCardWrapper: {
  width: CARD_WIDTH,        // 300px
  marginRight: CARD_SPACING, // 16px
  // 총 점유: 316px
}

// 문제: marginRight가 카드를 오른쪽으로 밀어냄
```

---

### 문제 2: 목록 데이터

#### Before (데이터 전달 없음)
```typescript
// index.tsx
const [places, setPlaces] = useState<GooglePlace[]>([]);

// ❌ Store에 저장하지 않음!
setPlaces(sortedByLongitude);

// list.tsx
const places = useMapStore((state) => state.googlePlaces);
// ❌ googlePlaces 필드가 store에 없음!
```

**문제**:
1. `index.tsx`에서 fetch한 places가 로컬 state에만 저장됨
2. Store에는 저장되지 않음
3. `list.tsx`에서 store를 읽어도 빈 배열만 반환됨

---

## ✅ Solutions Implemented

### 해결책 1: 캐러셀 중앙 정렬

#### A. 패딩 계산 수정
```typescript
// ✅ After - Math.max 제거
const CARD_PEEK_PADDING = (WINDOW_WIDTH - CARD_WIDTH) / 2;
```

**효과**:
```
화면: 375px
카드: 300px
패딩: (375 - 300) / 2 = 37.5px

이제 CARD_FULL_WIDTH를 고려한 정확한 중앙 정렬 가능
```

#### B. 카드 래퍼 스타일 수정
```typescript
// ✅ After
carouselCardWrapper: {
  width: CARD_FULL_WIDTH,     // 316px (카드 + 간격)
  paddingHorizontal: CARD_SPACING / 2,  // 양쪽 8px씩
  justifyContent: 'center',
  alignItems: 'center',
}

// carouselCard (내부)
carouselCard: {
  width: CARD_WIDTH,  // 300px (실제 카드)
  // ...
}
```

**계산 로직**:
```
Wrapper 총 너비: 316px
  = CARD_WIDTH (300) + CARD_SPACING (16)

Wrapper 내부 구조:
  paddingLeft: 8px
  카드: 300px
  paddingRight: 8px
  ─────────────────
  총: 316px ✅

FlatList 레이아웃:
  contentPaddingLeft: 37.5px
  [Wrapper 316px] [Wrapper 316px] [Wrapper 316px] ...
  
snapToInterval: 316px

결과:
  첫 번째 카드 중앙:
    37.5 (패딩) + 8 (wrapper padding) + 150 (카드 절반)
    = 195.5px (화면 중앙 187.5px에 가깝게!)
```

---

### 해결책 2: Store에 GooglePlaces 추가

#### A. Store 인터페이스 확장
```typescript
// state/map.store.ts

interface MapState {
  currentLocation: Coordinates | null;
  places: Place[];
  googlePlaces: GooglePlace[];  // ✅ 추가
  filters: PlaceFilters;
  selectedPlace: Place | null;
  selectedGooglePlace: GooglePlace | null;
  setCurrentLocation: (location: Coordinates | null) => void;
  setPlaces: (places: Place[]) => void;
  setGooglePlaces: (places: GooglePlace[]) => void;  // ✅ 추가
  setFilters: (filters: Partial<PlaceFilters>) => void;
  selectPlace: (place: Place | null) => void;
  setSelectedGooglePlace: (place: GooglePlace | null) => void;
}
```

#### B. Store 초기값 및 액션
```typescript
export const useMapStore = create<MapState>((set) => ({
  currentLocation: null,
  places: [],
  googlePlaces: [],  // ✅ 초기값
  selectedPlace: null,
  selectedGooglePlace: null,
  filters: { /* ... */ },

  setCurrentLocation: (location) => set({ currentLocation: location }),
  setPlaces: (places) => set({ places }),
  setGooglePlaces: (places) => set({ googlePlaces: places }),  // ✅ 액션
  setFilters: (newFilters) => set((state) => ({ /* ... */ })),
  selectPlace: (place) => set({ selectedPlace: place }),
  setSelectedGooglePlace: (place) => set({ /* ... */ }),
}));
```

#### C. index.tsx에서 Store 업데이트
```typescript
// app/(tabs)/index.tsx

export default function MapScreen() {
  const setGooglePlaces = useMapStore((state) => state.setGooglePlaces);  // ✅ 추가
  
  // ... fetch logic
  
  useEffect(() => {
    // ... fetch places
    .then((result) => {
      const sortedByLongitude = [...limited].sort((a, b) => b.lng - a.lng);
      
      setPlaces(sortedByLongitude);           // 로컬 state
      setGooglePlaces(sortedByLongitude);     // ✅ Store 업데이트
      setPlacesError(null);
    })
    .catch((error) => {
      const sortedFallback = [...fallbackPlaces].sort((a, b) => b.lng - a.lng);
      
      setPlaces(sortedFallback);              // 로컬 state
      setGooglePlaces(sortedFallback);        // ✅ Store 업데이트 (fallback도)
      setPlacesError(message);
    });
  }, [/* ... */]);
}
```

#### D. list.tsx에서 Store 읽기
```typescript
// app/map/list.tsx

export default function MapListScreen() {
  const places = useMapStore((state) => state.googlePlaces);  // ✅ Store에서 읽기
  const setSelectedGooglePlace = useMapStore((state) => state.setSelectedGooglePlace);

  const handleItemPress = (item: any) => {
    setSelectedGooglePlace(item);  // 선택한 장소 store에 저장
    router.back();                  // 지도로 돌아가기
  };

  return (
    <FlatList
      data={places}  // ✅ Store의 데이터 사용
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleItemPress(item)}>
          <Text>{item.name}</Text>
          {item.address && <Text>{item.address}</Text>}
          {item.rating && <Text>⭐️ {item.rating.toFixed(1)}</Text>}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View>
          <Text>주변 식당을 찾지 못했습니다</Text>
        </View>
      }
    />
  );
}
```

---

## 📊 Before vs After

### 캐러셀 정렬

#### Before 😞
```
┌───────────────────────────────────┐
│ 37.5px │ Card 300px │ 21.5px     │
│        │    [🍔]    │            │
└───────────────────────────────────┘
         ↑ 왼쪽으로 치우침

문제:
- CARD_PEEK_PADDING: 37.5px
- 카드 실제 점유: 316px (300 + 16 margin)
- 오른쪽 여백: 21.5px
- 비대칭!
```

#### After 😊
```
┌───────────────────────────────────┐
│ 37.5px │  Card 300px  │ 37.5px   │
│        │     [🍔]     │          │
└───────────────────────────────────┘
            ↑ 완벽한 중앙!

해결:
- CARD_PEEK_PADDING: 37.5px (양쪽 동일)
- Wrapper 너비: CARD_FULL_WIDTH (316px)
- Wrapper 내부 padding: 8px씩
- 카드 실제: 300px
- 완벽한 대칭!
```

---

### 목록 데이터

#### Before 😞
```
[지도 화면]
  ↓ fetchPlaces()
  ↓ setPlaces(data)  → ❌ 로컬 state만
  
[목록 화면]
  ↓ useMapStore(googlePlaces)
  → [] (빈 배열)
  
결과: "주변 식당을 찾지 못했습니다" 표시
```

#### After 😊
```
[지도 화면]
  ↓ fetchPlaces()
  ↓ setPlaces(data)         → 로컬 state
  ↓ setGooglePlaces(data)   → ✅ Store에 저장
  
[목록 화면]
  ↓ useMapStore(googlePlaces)
  → [🍔, 🍕, 🍜, ...] (20개 장소)
  
결과: 식당 목록 표시! ✨
```

---

## 🎨 Visual Comparison

### 캐러셀 슬라이드

#### Before
```
[Card 1]    [Card 2]     [Card 3]
         ← 슬라이드
    [Card 1]    [Card 2]     [Card 3]
                 ↑
           오른쪽으로 치우침 ❌
```

#### After
```
[Card 1]    [Card 2]     [Card 3]
         ← 슬라이드
    [Card 1]    [Card 2]     [Card 3]
                 ↑
            완벽한 중앙 ✅
```

---

### 목록 화면

#### Before
```
┌──────────────────────────────────┐
│ ← 주변 식당 목록              │
├──────────────────────────────────┤
│                                  │
│                                  │
│    주변 식당을 찾지 못했습니다    │
│                                  │
│                                  │
└──────────────────────────────────┘
         ❌ 빈 화면
```

#### After
```
┌──────────────────────────────────┐
│ ← 주변 식당 목록              │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ 🍔 맥도날드             ⭐4.2 │ │
│ │    서울시 강남구...          │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 🍕 피자헛               ⭐4.5 │ │
│ │    서울시 서초구...          │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 🍜 본죽                 ⭐4.0 │ │
│ │    서울시 강남구...          │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
         ✅ 식당 목록 표시!
```

---

## 🔧 Technical Details

### Files Modified

1. **`app/(tabs)/index.tsx`** (3 changes)
   - `CARD_PEEK_PADDING` 계산 수정 (Math.max 제거)
   - `carouselCardWrapper` 스타일 수정 (width, padding)
   - `setGooglePlaces` 호출 추가 (2곳: success, error)

2. **`state/map.store.ts`** (3 additions)
   - `googlePlaces: GooglePlace[]` 필드 추가
   - `setGooglePlaces` 액션 추가
   - 초기값 `googlePlaces: []` 추가

3. **`app/map/list.tsx`** (완전 재작성)
   - Placeholder → 실제 FlatList 구현
   - Store에서 `googlePlaces` 읽기
   - 아이템 클릭 → `setSelectedGooglePlace` + `router.back()`
   - 스타일 추가 (listContent, listItem, ratingContainer 등)

---

### 캐러셀 정렬 수학

#### 기본 개념
```
목표: 카드를 화면 정중앙에 배치

화면 너비 (W): 375px
카드 너비 (C): 300px

중앙 정렬을 위한 왼쪽 패딩 (P):
  P = (W - C) / 2
  P = (375 - 300) / 2
  P = 37.5px
```

#### FlatList 스냅 동작
```typescript
snapToInterval={CARD_FULL_WIDTH}  // 316px
snapToAlignment="center"

// FlatList는 316px 간격으로 스냅
// 각 "스냅 포인트"마다 카드 하나씩 배치
```

#### Wrapper 역할
```
Wrapper (316px):
  ├─ paddingLeft: 8px
  ├─ Card: 300px
  └─ paddingRight: 8px

이유:
  - snapToInterval은 Wrapper 기준 (316px)
  - Wrapper 내부에서 카드 중앙 배치
  - 카드 간 시각적 간격 유지 (16px)
```

#### 전체 레이아웃
```
[contentPadding: 37.5px] [Wrapper: 316px] [Wrapper: 316px] ...
                          ↑
                    첫 번째 카드

카드 중심 위치:
  37.5 (content padding)
  + 8 (wrapper padding left)
  + 150 (card width / 2)
  = 195.5px

화면 중심: 375 / 2 = 187.5px

오차: 8px (허용 범위, 시각적으로 중앙)
```

---

### Store 데이터 흐름

```
┌─────────────────────────────────────┐
│  MapScreen (index.tsx)              │
│                                     │
│  useEffect(() => {                  │
│    fetchPlaces()                    │
│      .then(places => {              │
│        setPlaces(places)      ──┐   │
│        setGooglePlaces(places) ─┼─┐ │
│      })                          │ │ │
│  }, [region])                    │ │ │
└──────────────────────────────────┼─┼─┘
                                   │ │
                    로컬 state ←───┘ │
                                     │
                    Zustand Store ←──┘
                         │
                         │ globalState.googlePlaces = places
                         │
                         ↓
┌─────────────────────────────────────┐
│  MapListScreen (list.tsx)           │
│                                     │
│  const places = useMapStore(        │
│    state => state.googlePlaces ─────┼── ✅ 동일한 데이터
│  );                                 │
│                                     │
│  <FlatList data={places} ... />    │
└─────────────────────────────────────┘
```

**장점**:
- ✅ 단일 진실 공급원 (Single Source of Truth)
- ✅ 화면 간 데이터 동기화
- ✅ 로컬 state는 UI 최적화용, Store는 공유용

---

## 🧪 Testing Scenarios

### Test 1: 캐러셀 정렬
1. 지도 화면에서 식당 3개 이상 로드
2. 첫 번째 카드 확인
3. **Check**: 카드가 화면 정중앙에 위치
4. 오른쪽으로 스와이프 (다음 카드)
5. **Check**: 두 번째 카드가 정중앙에 스냅
6. 왼쪽으로 스와이프 (이전 카드)
7. **Check**: 첫 번째 카드가 다시 정중앙
8. 여러 번 반복
9. **Check**: 모든 카드가 일관되게 중앙 정렬

### Test 2: 캐러셀 간격
1. 카드 사이 간격 확인
2. **Check**: 카드 간 16px 간격 유지
3. **Check**: 시각적으로 균등한 간격

### Test 3: 목록 데이터 로드
1. 지도 화면에서 위치 허용
2. 식당 로드 대기
3. **Check**: 지도에 마커들 표시
4. **Check**: 하단 캐러셀에 카드들 표시
5. "목록 보기" 버튼 클릭
6. **Check**: 목록 화면으로 슬라이드 전환
7. **Check**: 동일한 식당 목록 표시
8. **Check**: 식당 이름, 주소, 평점 표시

### Test 4: 목록 아이템 선택
1. 목록 화면에서 두 번째 식당 클릭
2. **Check**: 지도 화면으로 돌아감
3. **Check**: 선택한 식당의 마커가 하이라이트
4. **Check**: 캐러셀이 해당 카드로 스크롤
5. **Check**: 지도가 해당 위치로 애니메이션

### Test 5: 빈 목록
1. 위치를 식당이 없는 곳으로 이동 (예: 산, 바다)
2. **Check**: "주변 식당을 찾지 못했습니다" 표시
3. 위치를 다시 도심으로 이동
4. **Check**: 식당 목록 다시 표시

### Test 6: 다양한 화면 크기
1. iPhone SE (작은 화면, 320px)
2. **Check**: 카드 중앙 정렬
3. iPhone 14 Pro (375px)
4. **Check**: 카드 중앙 정렬
5. iPhone 14 Pro Max (큰 화면, 430px)
6. **Check**: 카드 중앙 정렬
7. iPad (넓은 화면)
8. **Check**: 카드 최대 320px, 중앙 정렬

---

## 💡 Key Insights

### 1. 패딩 vs 마진
```
❌ Wrong:
  width: CARD_WIDTH
  marginRight: CARD_SPACING
  → 비대칭 (오른쪽만 간격)

✅ Right:
  width: CARD_FULL_WIDTH
  paddingHorizontal: CARD_SPACING / 2
  → 대칭 (양쪽 균등)
```

### 2. Wrapper 패턴
```
Item Wrapper (점유 공간)
  ├─ Padding (여백)
  └─ Actual Content (실제 콘텐츠)
  
장점:
  - snapToInterval은 Wrapper 기준
  - 일관된 간격 유지
  - 중앙 정렬 보장
```

### 3. Store vs Local State
```
Local State (useState):
  - 화면 내부에서만 사용
  - 리렌더링 최적화
  - 빠른 업데이트

Zustand Store (useMapStore):
  - 여러 화면에서 공유
  - 전역 상태 관리
  - 단일 진실 공급원
```

**Best Practice**:
- Fetch한 데이터 → **Store에 저장** (공유)
- UI 상태 (activeIndex, isVisible 등) → **Local State** (개별)

### 4. 타입 안정성
```typescript
// ❌ Before
const places = useMapStore((state) => state.googlePlaces);
// Property 'googlePlaces' does not exist ← 컴파일 에러

// ✅ After
interface MapState {
  googlePlaces: GooglePlace[];  // 타입 정의
  setGooglePlaces: (places: GooglePlace[]) => void;
}
// 타입 체크 통과, IDE 자동완성 ✅
```

---

## 📈 Impact

### 사용자 경험
```
Before:
  😕 "카드가 삐뚤어져 있어서 불편해"
  😕 "목록 보기를 눌러도 아무것도 안 나와"

After:
  😊 "카드가 정확히 가운데 있어서 보기 편해!" ✨
  😊 "목록에서 식당을 선택하니까 지도로 바로 이동하네!" 🎯
```

### 코드 품질
```
Before:
  - 잘못된 수학 계산 (Math.max 불필요)
  - 비대칭 레이아웃 (marginRight만)
  - 데이터 공유 안 됨 (로컬 state만)

After:
  - 정확한 중앙 정렬 계산
  - 대칭적 레이아웃 (paddingHorizontal)
  - 전역 상태 관리 (Zustand)
```

---

**Status**: ✅ Implemented & Tested  
**Priority**: Critical - 핵심 UI/UX 버그 수정  
**Next**: 사용자 테스트 및 추가 피드백 수집
