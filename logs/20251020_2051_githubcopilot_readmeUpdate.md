# [20251020_2051] README.md 업데이트 - Google Places API 통합 반영

**Agent:** GitHub Copilot  
**Branch:** main  
**Date:** 2025-10-20

---

## 📋 목적

프로젝트의 현재 상태를 정확히 반영하도록 README.md 수정:
- **Discover (지도/식당) 탭**: Google Places API 실제 통합 완료 (✅ 실제 데이터)
- **Community (밥친구) 탭**: 목업 데이터 사용 중 (⚠️ 개발용 mock data)

기존 README는 두 탭 모두 목업 데이터라고 표기되어 있어 혼동 가능성 존재.

---

## 🔍 분석 결과

### 1. Discover 탭 현황
**파일**: `app/(tabs)/index.tsx`, `services/places.google.ts`

```typescript
// services/places.google.ts
export async function fetchNearbyPlaces(region: Region, signal?: AbortSignal): Promise<Place[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY as string | undefined;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');
  
  // Google Places API (New) searchNearby 호출
  const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [...],
    },
    body: JSON.stringify({
      includedTypes: ['restaurant', 'cafe'],
      maxResultCount: 20,
      locationRestriction: { circle: { center, radius } },
    }),
  });
  // ...
}
```

**결과**:
- ✅ 실제 Google Places API 통합 완료
- ✅ 최대 200개 장소 fetch (페이지네이션)
- ✅ 실제 사진, 평점, 주소, 타입 표시
- ⚠️ API 실패 시 45개 Seoul mock 데이터로 fallback

### 2. Community 탭 현황
**파일**: `hooks/useCommunity.ts`, `app/(tabs)/community.tsx`

```typescript
// hooks/useCommunity.ts
export const USE_MOCK_DATA = true; // ⚠️ Feature Flag

const MOCK_USERS: Profile[] = [
  { id: 'mock-1', display_name: '김철수', ... },
  { id: 'mock-2', display_name: '이영희', ... },
  // ... 8명의 페르소나
];

export function useUserCards() {
  useEffect(() => {
    if (USE_MOCK_DATA) {
      // 목업 데이터 필터링 및 반환
      let filtered = [...MOCK_USERS];
      // ... 거리/예산/식단 필터 적용
      setUsers(filtered);
      return;
    }
    
    // 실제 Supabase 쿼리 (현재 비활성화)
    // ...
  }, [filters]);
}
```

**결과**:
- ⚠️ 목업 데이터 사용 중 (8명의 mock profiles)
- ✅ Feature Flag로 쉽게 전환 가능
- ✅ UI에 "목업 모드" 배지 표시
- 📝 `USE_MOCK_DATA = false`로 변경하면 실제 DB 연동

---

## ✏️ 변경 사항

### 1. Features 섹션 업데이트
**Before**:
```md
- **Map Discovery**: Browse nearby restaurants on an interactive map...
- **Community**: Find meal buddies nearby with distance-based filtering
```

**After**:
```md
- **Map Discovery**: Browse nearby restaurants on an interactive map...
  - ✅ **Using Google Places API** for real restaurant data
  - Fetches up to 200 restaurants/cafes within 10km radius
  - Real photos, ratings, addresses, and place types
- **Community**: Find meal buddies nearby with distance-based filtering
  - ⚠️ **Currently using mock data** (8 test profiles)
  - Easy toggle to switch to real Supabase user profiles
```

### 2. Key Features Explained 섹션 재작성
**Before**:
```md
### Mock Restaurant Data
The app includes 45 Seoul restaurants across various neighborhoods...
Data is client-side filtered for MVP simplicity.
```

**After**:
```md
### Restaurant Discovery (Google Places API Integration)
The Discover tab uses **Google Places API (New)** to fetch real restaurant and cafe data...
- Queries nearby places within a 10km radius using `searchNearby` endpoint
- Supports pagination to fetch up to 200 results per search
- Falls back to 45 mock Seoul restaurants if API fails or on web platform
- Displays real photos, ratings, and addresses from Google
- Filters results by distance, category, and search query

**Implementation**: `services/places.google.ts` handles API calls...

### Community Tab (Mock Data)
The Community (밥친구) tab currently uses **mock data** for development:
- 8 mock user profiles with varied preferences...
- Feature flag `USE_MOCK_DATA = true` in `hooks/useCommunity.ts`
- Easy toggle to switch to real Supabase profiles when ready
```

### 3. Development Notes 섹션 확장
**Added**:
```md
### Google Places API Integration
The app uses **Google Places API (New)** for the Discover tab:
- **Environment Variable**: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` required in `.env`
- **Endpoint**: `places:searchNearby` with `includedTypes: ['restaurant', 'cafe']`
- **Features**: Real-time search, photos, ratings, addresses, place types
- **Fallback**: On error or web platform, uses 45 Seoul mock restaurants
- **Rate Limits**: Respects API pagination with 1.2s delays between pages

### Community Mock Data
The Community tab uses a **feature flag** for mock vs. real data:
- **Flag**: `USE_MOCK_DATA = true` in `hooks/useCommunity.ts`
- **Mock Users**: 8 personas with Korean names, varied preferences
- **Purpose**: UI development and testing without requiring real Supabase profiles
- **Transition**: Toggle flag to `false` to use real user profiles from database
```

### 4. Setup 섹션 - Environment Variables
**Before**:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
```

**After**:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key  # Required for restaurant discovery
```

**Note 추가**:
> Without `GOOGLE_PLACES_API_KEY`, the Discover tab falls back to 45 mock Seoul restaurants.

### 5. Future Enhancements 업데이트
**Before**:
```md
- Real places API integration (Google Places, Yelp)
```

**After**:
```md
- **Community Tab**: Switch from mock to real Supabase profiles (`USE_MOCK_DATA = false`)
- **Advanced Place Filters**: Cuisine type, opening hours, price level from Google
```

---

## 📊 수정 파일

| 파일 | 변경 유형 | 라인 수 |
|------|----------|---------|
| `README.md` | 섹션 5곳 수정/확장 | +45 -8 |

---

## 🔑 Key Diff (condensed)

```diff
## Features
- **Map Discovery**: ...
+  - ✅ **Using Google Places API** for real restaurant data
+  - Fetches up to 200 restaurants/cafes within 10km radius
- **Community**: ...
+  - ⚠️ **Currently using mock data** (8 test profiles)
+  - Easy toggle to switch to real Supabase user profiles

## Setup
2. **Environment Variables**:
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
+  EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key  # Required

+  > **Note**: Without `GOOGLE_PLACES_API_KEY`, falls back to 45 mock restaurants.

## Key Features Explained
-### Mock Restaurant Data
-The app includes 45 Seoul restaurants... Data is client-side filtered...
+### Restaurant Discovery (Google Places API Integration)
+The Discover tab uses **Google Places API (New)** to fetch real restaurant...
+- Queries nearby places within 10km radius using `searchNearby` endpoint
+- Supports pagination to fetch up to 200 results per search
+- Falls back to 45 mock Seoul restaurants if API fails
+**Implementation**: `services/places.google.ts` handles API calls...
+
+### Community Tab (Mock Data)
+Currently uses **mock data** for development:
+- 8 mock user profiles with varied preferences
+- Feature flag `USE_MOCK_DATA = true` in `hooks/useCommunity.ts`

## Development Notes
+### Google Places API Integration
+- **Environment Variable**: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` required
+- **Endpoint**: `places:searchNearby` with `includedTypes: ['restaurant', 'cafe']`
+- **Features**: Real-time search, photos, ratings, addresses
+- **Fallback**: 45 Seoul mock restaurants on error/web
+
+### Community Mock Data
+- **Flag**: `USE_MOCK_DATA = true` in `hooks/useCommunity.ts`
+- **Purpose**: UI development without real Supabase profiles
+- **Transition**: Toggle to `false` for real user profiles

## Future Enhancements
-  - Real places API integration (Google Places, Yelp)
+  - **Community Tab**: Switch from mock to real profiles (`USE_MOCK_DATA = false`)
+  - **Advanced Place Filters**: Cuisine type, opening hours, price level
```

---

## ✅ 검증 사항

1. **정확성**: 코드베이스 분석을 통해 실제 구현 상태 확인
   - ✅ `services/places.google.ts` - Google Places API 통합 확인
   - ✅ `hooks/useCommunity.ts` - `USE_MOCK_DATA = true` 확인
   - ✅ `app/(tabs)/index.tsx` - fetchNearbyPlaces 호출 및 fallback 로직 확인

2. **일관성**: 문서 전체에서 용어 통일
   - ✅ "Google Places API (New)" 명시
   - ✅ "mock data" vs "real data" 명확히 구분
   - ✅ Feature flag 메커니즘 설명

3. **실용성**: 개발자가 쉽게 이해하고 전환할 수 있도록
   - ✅ Environment variable 요구사항 명시
   - ✅ Fallback 동작 설명
   - ✅ Community 탭 전환 방법 (`USE_MOCK_DATA = false`)

---

## 📝 추가 컨텍스트

### Google Places API 통합 상세
- **파일**: `services/places.google.ts` (126줄)
- **API 버전**: Google Places API (New)
- **엔드포인트**: `https://places.googleapis.com/v1/places:searchNearby`
- **페이지네이션**: `nextPageToken` 사용, 1.2초 딜레이
- **최대 결과**: 200개 (PAGE_SIZE=20, 최대 10페이지)
- **필드**: id, name, location, rating, photos, types, address 등

### Community 목업 구현
- **파일**: `hooks/useCommunity.ts` (8명 mock profiles)
- **Feature Flag**: 파일 상단 export
- **목업 사용자**: 김철수, 이영희, 박민수, 최지훈, 정수연, 강태호, 윤서아, 장민호
- **필터링**: 거리, 예산, 식단 태그 - 실제 로직과 동일하게 구현
- **UI 표시**: `app/(tabs)/community.tsx`에 "목업 모드" 배지

### Fallback 메커니즘 (Discover)
- **Trigger**: API 키 없음 또는 fetch 실패
- **Data**: `lib/places.ts`의 `MOCK_PLACES` (45개 Seoul 레스토랑)
- **변환**: `FALLBACK_GOOGLE_PLACES`로 GooglePlace 타입 매핑
- **필터링**: 10km 반경 내 장소만 표시

---

## 🎯 결론

README.md가 이제 프로젝트의 실제 구현 상태를 정확히 반영:
- ✅ Discover 탭 = Google Places API 실제 통합 (fallback 있음)
- ⚠️ Community 탭 = 목업 데이터 (전환 가능)

개발자와 사용자가 각 탭의 데이터 소스를 명확히 이해하고, 필요시 쉽게 전환할 수 있도록 문서화 완료.

---

**작성자**: GitHub Copilot  
**작성일**: 2025-10-20  
**상태**: ✅ 완료
