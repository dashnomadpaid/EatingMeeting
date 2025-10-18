# 밥친구 탭 목업 구현 계획

**작성일**: 2025-10-18  
**목적**: 밥친구 탭의 UI/UX를 확인하기 위한 임시 목업 데이터 구현  
**원칙**: 언제든 쉽게 제거하고 실제 기능으로 전환 가능하도록

---

## 📋 목차

1. [현재 상황 분석](#현재-상황-분석)
2. [디자인 시스템](#디자인-시스템)
3. [목업 데이터 구조](#목업-데이터-구조)
4. [구현 방안](#구현-방안)
5. [UI/UX 디자인](#uiux-디자인)
6. [실행 계획](#실행-계획)
7. [전환 가이드](#전환-가이드)

---

## 🔍 현재 상황 분석

### 기존 구조
```
app/(tabs)/community.tsx
  ↓ uses
hooks/useCommunity.ts
  ↓ queries
Supabase DB (profiles 테이블)
```

### 문제점
- ✅ UI/로직은 구현되어 있음
- ❌ 실제 사용자 데이터가 없음
- ❌ 빈 화면만 표시됨 ("주변에 밥친구들이 없습니다")
- ❌ UI/UX 테스트 불가능

### 목표
- 🎯 다양한 프로필 카드로 UI 검증
- 🎯 필터링 기능 테스트
- 🎯 인터랙션 확인 (스크롤, 채팅 시작 등)
- 🎯 나중에 한 줄만 바꿔서 실제 데이터로 전환

---

## 🎨 디자인 시스템

### 색상 팔레트
```typescript
const COLORS = {
  // Primary
  primary: '#FF6B35',      // 주황색 (브랜드 컬러)
  primaryLight: '#FFF8F5', // 연한 주황색
  
  // Grayscale
  black: '#000000',
  gray900: '#1A1A1A',
  gray700: '#666666',
  gray500: '#999999',
  gray300: '#CCCCCC',
  gray100: '#F5F5F5',
  white: '#FFFFFF',
  
  // Semantic
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF3B30',
  
  // Backgrounds
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  
  // Borders
  border: '#EEEEEE',
  borderLight: '#F5F5F5',
};
```

### 타이포그래피
```typescript
const TYPOGRAPHY = {
  // Headers
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  
  // Body
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  
  // Captions
  caption1: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption2: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
  
  // Buttons
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
};
```

### 간격 시스템
```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

### 컴포넌트 스타일

#### 카드 디자인
```
┌──────────────────────────────────────┐
│ ┌────┐  김철수              0.5km   │ ← 헤더 영역
│ │ 👤 │  맛집 탐방을 좋아하는...      │   Avatar + 이름 + 거리
│ └────┘                               │
│                                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │ ← 태그 영역
│ │한식 │ │분식 │ │중식 │ │1-2만│   │   diet_tags + budget
│ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                      │
│ ┌────────────────────────────────┐  │ ← 액션 버튼
│ │        채팅 시작 →             │  │   주황색 버튼
│ └────────────────────────────────┘  │
└──────────────────────────────────────┘

스타일:
- 카드: 16px 둥근 모서리, 흰색 배경, 16px 패딩
- 간격: 카드 간 16px 마진
- 그림자: 미묘한 elevation (iOS 스타일)
```

#### Avatar 디자인
```
┌─────────┐
│         │  크기: large (64x64)
│   👤    │  배경: #F5F5F5
│         │  텍스트: 이름 첫 글자 (없으면 기본 아이콘)
└─────────┘  둥근 모서리: 32px (완전한 원)
```

#### Tag 디자인
```
Diet Tags (식단 태그):
┌─────────┐
│  한식   │  배경: #F5F5F5
└─────────┘  텍스트: #333333
             패딩: 6px 12px
             둥근 모서리: 16px

Budget Tag (예산):
┌─────────┐
│ 1-2만원 │  배경: #FFF8F5 (연한 주황)
└─────────┘  텍스트: #FF6B35 (주황)
             패딩: 6px 12px
             둥근 모서리: 16px
```

#### 거리 표시
```
Distance Display:
0.5km   ← 주황색 (#FF6B35), 14px, Medium
```

---

## 📦 목업 데이터 구조

### Profile 타입 (기존)
```typescript
interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  diet_tags: string[];
  budget_range: string;
  approx_lat: number | null;
  approx_lng: number | null;
  distance?: number; // km 단위
  primaryPhoto?: {
    url: string | null;
  };
}
```

### 목업 데이터 세트

#### 페르소나 설계

**1. 김철수 - 일반 직장인**
- 목적: 점심/저녁 밥친구
- 특징: 한식 중심, 합리적 가격
- 거리: 매우 가까움 (0.5km)

**2. 이영희 - 건강 지향**
- 목적: 비건/채식 동료
- 특징: 샐러드, 건강식
- 거리: 가까움 (1.2km)

**3. 박민수 - 야식러버**
- 목적: 저녁 늦게 식사
- 특징: 치킨, 야식
- 거리: 가까움 (0.8km)

**4. 최지훈 - 고급 취향**
- 목적: 오마카세, 파인다이닝
- 특징: 일식, 고가 예산
- 거리: 중간 (1.5km)

**5. 정수연 - 카페러버**
- 목적: 브런치, 디저트
- 특징: 양식, 카페
- 거리: 매우 가까움 (0.3km)

**6. 강태호 - 중식 마니아**
- 목적: 중화요리 탐방
- 특징: 중식 전문
- 거리: 중간 (1.8km)

**7. 윤서아 - 분식 팬**
- 목적: 간단한 식사
- 특징: 분식, 저렴한 가격
- 거리: 가까움 (0.6km)

**8. 장민호 - 디저트 헌터**
- 목적: 디저트 카페 투어
- 특징: 디저트, 베이커리
- 거리: 중간 (2.0km)

### 실제 목업 데이터
```typescript
const MOCK_USERS: Profile[] = [
  {
    id: 'mock-1',
    display_name: '김철수',
    bio: '맛집 탐방을 좋아하는 직장인입니다. 주말에 새로운 곳 가보실 분 구합니다!',
    diet_tags: ['한식', '분식', '중식'],
    budget_range: '1만원-2만원',
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    distance: 0.5,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-2',
    display_name: '이영희',
    bio: '비건 식단 선호합니다. 건강한 식사 같이 해요!',
    diet_tags: ['채식', '샐러드', '비건'],
    budget_range: '2만원-3만원',
    approx_lat: 37.5700,
    approx_lng: 126.9800,
    distance: 1.2,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-3',
    display_name: '박민수',
    bio: '야식 좋아합니다. 저녁 늦게 치맥 하실 분!',
    diet_tags: ['치킨', '한식', '야식'],
    budget_range: '2만원-3만원',
    approx_lat: 37.5650,
    approx_lng: 126.9750,
    distance: 0.8,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-4',
    display_name: '최지훈',
    bio: '일식러버입니다. 스시 오마카세 좋아하시는 분 환영!',
    diet_tags: ['일식', '회', '초밥'],
    budget_range: '3만원 이상',
    approx_lat: 37.5680,
    approx_lng: 126.9820,
    distance: 1.5,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-5',
    display_name: '정수연',
    bio: '카페 투어 좋아합니다. 브런치 같이 하실 분!',
    diet_tags: ['양식', '브런치', '디저트'],
    budget_range: '1만원-2만원',
    approx_lat: 37.5690,
    approx_lng: 126.9760,
    distance: 0.3,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-6',
    display_name: '강태호',
    bio: '중화요리 마니아! 짬뽕 짜장 탕수육 좋아하시는 분!',
    diet_tags: ['중식', '중화요리', '아시안'],
    budget_range: '1만원-2만원',
    approx_lat: 37.5720,
    approx_lng: 126.9740,
    distance: 1.8,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-7',
    display_name: '윤서아',
    bio: '분식 좋아해요. 떡볶이 순대 튀김 최고!',
    diet_tags: ['분식', '한식', '길거리음식'],
    budget_range: '1만원 이하',
    approx_lat: 37.5640,
    approx_lng: 126.9770,
    distance: 0.6,
    primaryPhoto: { url: null },
  },
  {
    id: 'mock-8',
    display_name: '장민호',
    bio: '디저트 카페 투어 중! 케이크 마카롱 좋아하시는 분!',
    diet_tags: ['디저트', '베이커리', '카페'],
    budget_range: '2만원-3만원',
    approx_lat: 37.5630,
    approx_lng: 126.9810,
    distance: 2.0,
    primaryPhoto: { url: null },
  },
];
```

---

## 🔧 구현 방안

### 옵션 비교

| 방안 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| **Feature Flag** | 한 줄 변경으로 전환, 관리 용이 | 같은 파일에 두 로직 존재 | ⭐⭐⭐⭐⭐ |
| **별도 Mock Hook** | 완전 분리, 깔끔 | import 경로 변경 필요 | ⭐⭐⭐ |
| **환경 변수** | 빌드별 자동 전환 | 설정 복잡 | ⭐⭐⭐⭐ |

### 채택: Feature Flag 방식

#### 이유
1. ✅ 구현 간단: `const USE_MOCK_DATA = true;`
2. ✅ 전환 쉬움: `true` → `false`
3. ✅ 타입 안전: 동일한 타입 사용
4. ✅ 테스트 용이: 빠르게 전환 가능
5. ✅ Git 관리: 변경사항 추적

#### 구현 위치
- 파일: `hooks/useCommunity.ts`
- 위치: 파일 상단 (import 직후)

---

## 🎨 UI/UX 디자인

### 화면 레이아웃

```
┌──────────────────────────────────────────┐
│ 밥친구                            [필터]  │ ← Header (60px)
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 🎭 목업 데이터 (개발용)           │ │ ← Mock Badge (optional)
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ ┌────┐  김철수            0.5km   │ │
│  │ │ 👤 │  맛집 탐방을 좋아...       │ │ ← User Card 1
│  │ └────┘  [한식][분식][1-2만원]     │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │      채팅 시작 →             │ │ │
│  │  └──────────────────────────────┘ │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ ┌────┐  이영희            1.2km   │ │
│  │ │ 👤 │  비건 식단 선호...         │ │ ← User Card 2
│  │ └────┘  [채식][샐러드][2-3만원]   │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │      채팅 시작 →             │ │ │
│  │  └──────────────────────────────┘ │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ ┌────┐  박민수            0.8km   │ │
│  │ │ 👤 │  야식 좋아합니다...        │ │ ← User Card 3
│  │ └────┘  [치킨][야식][2-3만원]     │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │      채팅 시작 →             │ │ │
│  │  └──────────────────────────────┘ │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

### 인터랙션 디자인

#### 1. 스크롤
```
동작: 세로 스크롤
효과: 부드러운 스크롤
성능: FlatList 최적화 (getItemLayout)
```

#### 2. 카드 터치
```
Before:
┌─────────────┐
│   Card      │
└─────────────┘

Press:
┌─────────────┐
│   Card      │ ← opacity: 0.7
└─────────────┘

After:
┌─────────────┐
│   Card      │ ← 원래대로
└─────────────┘
```

#### 3. 채팅 시작 버튼
```
목업 모드:
  터치 → Alert 표시
  "목업 모드입니다. 실제 채팅은 나중에 구현됩니다!"

실제 모드:
  터치 → DM 생성 → 채팅 화면 이동
```

#### 4. 필터 (나중에 구현)
```
[필터] 버튼 터치
  ↓
필터 Modal 표시
  - 거리 (슬라이더)
  - 예산 (체크박스)
  - 식단 태그 (체크박스)
  ↓
적용 → 카드 목록 업데이트
```

### 빈 상태 디자인

```
┌──────────────────────────────────────────┐
│                                          │
│            😔                            │
│                                          │
│       주변에 밥친구들이 없습니다          │
│                                          │
│     필터를 조정하거나                     │
│     나중에 다시 확인해보세요              │
│                                          │
└──────────────────────────────────────────┘

스타일:
- 이모지: 48px
- 메인 텍스트: 16px, #666
- 서브 텍스트: 14px, #999
- 중앙 정렬
- 패딩: 48px
```

### 로딩 상태 디자인

```
┌──────────────────────────────────────────┐
│                                          │
│            ⏳                            │
│                                          │
│          불러오는 중...                   │
│                                          │
└──────────────────────────────────────────┘

스타일:
- 이모지: 48px (애니메이션)
- 텍스트: 16px, #666
- 중앙 정렬
```

---

## 📝 실행 계획

### Phase 1: 목업 데이터 추가 (10분)
```typescript
// hooks/useCommunity.ts

// 1. 상단에 Feature Flag 추가
const USE_MOCK_DATA = true; // ⚠️ 나중에 false로 변경

// 2. 목업 데이터 정의
const MOCK_USERS: Profile[] = [
  // ... 8명의 프로필
];

// 3. 로딩 상태 시뮬레이션
// setTimeout으로 500ms 딜레이
```

### Phase 2: 조건부 로직 구현 (15분)
```typescript
export function useUserCards() {
  // ...
  
  useEffect(() => {
    // 🎭 목업 모드
    if (USE_MOCK_DATA) {
      setLoading(true);
      
      setTimeout(() => {
        let filtered = [...MOCK_USERS];
        
        // 필터 적용
        if (filters.budget.length > 0) {
          filtered = filtered.filter(u => 
            filters.budget.includes(u.budget_range as any)
          );
        }
        
        if (filters.dietTags.length > 0) {
          filtered = filtered.filter(u =>
            filters.dietTags.some(tag => u.diet_tags.includes(tag))
          );
        }
        
        // 거리 필터
        filtered = filtered.filter(u => 
          u.distance! <= filters.maxDistance
        );
        
        setUsers(filtered as Profile[]);
        setLoading(false);
      }, 500);
      
      return;
    }
    
    // 🔴 실제 DB 쿼리 (기존 코드)
    if (!session || !currentLocation) return;
    
    const loadUsers = async () => {
      // ... 기존 코드 유지
    };
    
    loadUsers();
  }, [session, currentLocation, filters]);
  
  return { users, loading };
}
```

### Phase 3: UI에 목업 뱃지 추가 (선택, 5분)
```typescript
// app/(tabs)/community.tsx

// 상단에 import
import { USE_MOCK_DATA } from '@/hooks/useCommunity'; // export 필요

// render
<View style={styles.container}>
  <View style={styles.header}>
    <Text style={styles.title}>밥친구</Text>
  </View>
  
  {USE_MOCK_DATA && (
    <View style={styles.mockBadge}>
      <Text style={styles.mockText}>🎭 목업 데이터 (개발용)</Text>
    </View>
  )}
  
  <FlatList ... />
</View>

// 스타일 추가
mockBadge: {
  backgroundColor: '#FFF3E0',
  padding: 12,
  margin: 16,
  marginBottom: 0,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#FFE0B2',
},
mockText: {
  fontSize: 14,
  color: '#E65100',
  textAlign: 'center',
  fontWeight: '600',
},
```

### Phase 4: 채팅 버튼 목업 처리 (5분)
```typescript
// app/(tabs)/community.tsx

const handleStartChat = async (user: Profile) => {
  // 🎭 목업 모드 체크
  if (USE_MOCK_DATA) {
    Alert.alert(
      '목업 모드',
      '실제 채팅 기능은 나중에 구현됩니다!\n\n' +
      `선택한 사용자: ${user.display_name}`,
      [{ text: '확인', style: 'default' }]
    );
    return;
  }
  
  // 🔴 실제 채팅 시작 (기존 코드)
  const threadId = await createOrOpenDM(user.id);
  if (threadId) {
    router.push(`/chat/thread/${threadId}`);
  }
};
```

### Phase 5: 테스트 (10분)
```
✅ 목업 데이터 8명 표시 확인
✅ 스크롤 부드러움 확인
✅ 카드 디자인 확인
✅ 태그 표시 확인
✅ 거리 표시 확인
✅ 채팅 버튼 → Alert 표시 확인
✅ 필터 작동 확인 (예산, 식단)
✅ 목업 뱃지 표시 확인
```

---

## 🔄 전환 가이드

### 목업 → 실제 데이터 전환

#### Step 1: Feature Flag 끄기
```typescript
// hooks/useCommunity.ts

// ❌ Before
const USE_MOCK_DATA = true;

// ✅ After
const USE_MOCK_DATA = false;
```

#### Step 2: 목업 코드 제거 (선택)
```typescript
// 1. MOCK_USERS 배열 삭제
// 2. useEffect의 목업 분기 삭제
// 3. USE_MOCK_DATA export 제거
// 4. community.tsx의 목업 뱃지 제거
```

#### Step 3: 실제 데이터 확인
```
✅ Supabase에 실제 프로필 존재
✅ approx_lat, approx_lng 값 있음
✅ currentLocation 권한 허용
✅ 거리 계산 정상 작동
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 초기 로딩
```
1. 앱 시작
2. 밥친구 탭 클릭
3. ✅ "불러오는 중..." 표시 (500ms)
4. ✅ 8명의 프로필 카드 표시
5. ✅ 목업 뱃지 표시 (🎭 목업 데이터)
```

### 시나리오 2: 스크롤
```
1. 프로필 목록 위아래 스크롤
2. ✅ 부드러운 스크롤
3. ✅ 카드 간격 일정 (16px)
4. ✅ 하단 여백 적절
```

### 시나리오 3: 카드 상세 정보
```
1. 각 카드 확인
2. ✅ Avatar 표시 (이름 첫 글자)
3. ✅ 이름, 거리 표시
4. ✅ Bio 텍스트 (최대 2줄)
5. ✅ 태그들 표시 (diet + budget)
6. ✅ 채팅 시작 버튼
```

### 시나리오 4: 채팅 시작
```
1. 임의 카드의 "채팅 시작" 버튼 클릭
2. ✅ Alert 표시
3. ✅ 메시지: "목업 모드입니다..."
4. ✅ 선택한 사용자 이름 표시
5. "확인" 클릭 → Alert 닫힘
```

### 시나리오 5: 필터링 (예산)
```
1. 필터에서 "1만원-2만원" 선택
2. ✅ 해당 예산의 프로필만 표시
3. ✅ 김철수, 정수연, 강태호 (3명)
4. 필터 해제
5. ✅ 전체 8명 다시 표시
```

### 시나리오 6: 필터링 (식단)
```
1. 필터에서 "한식" 선택
2. ✅ 한식 태그 있는 프로필만 표시
3. ✅ 김철수, 박민수, 윤서아 (3명)
4. "중식" 추가 선택
5. ✅ 한식 또는 중식 프로필 표시 (5명)
```

### 시나리오 7: 빈 목록
```
1. 필터에서 매우 제한적인 조건 설정
   (예: 1만원 이하 + 일식)
2. ✅ "주변에 밥친구들이 없습니다" 표시
3. ✅ 이모지 + 안내 문구
4. 필터 해제
5. ✅ 목록 다시 표시
```

---

## 📊 성능 고려사항

### FlatList 최적화
```typescript
<FlatList
  data={users}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  
  // 성능 최적화
  removeClippedSubviews={true}  // 화면 밖 뷰 제거
  maxToRenderPerBatch={10}      // 배치당 렌더링 수
  updateCellsBatchingPeriod={50} // 업데이트 간격
  initialNumToRender={10}        // 초기 렌더링 수
  windowSize={21}                // 렌더링 윈도우
  
  // iOS 최적화
  maintainVisibleContentPosition={{
    minIndexForVisible: 0,
  }}
/>
```

### 메모이제이션
```typescript
// renderItem 메모이제이션
const renderItem = useCallback(({ item }: { item: Profile }) => (
  <UserCard user={item} onPress={handleStartChat} />
), [handleStartChat]);

// handleStartChat 메모이제이션
const handleStartChat = useCallback(async (user: Profile) => {
  // ...
}, []);
```

---

## 📚 추가 고려사항

### 접근성 (Accessibility)
```typescript
// 카드에 accessibilityLabel 추가
<TouchableOpacity
  accessibilityLabel={`${user.display_name}, ${user.distance}km 거리`}
  accessibilityHint="채팅을 시작하려면 두 번 탭하세요"
  accessibilityRole="button"
>
```

### 다국어 지원 (나중에)
```typescript
// i18n 준비
{
  ko: {
    'community.title': '밥친구',
    'community.empty': '주변에 밥친구들이 없습니다',
    'community.loading': '불러오는 중...',
    'community.chat_button': '채팅 시작',
  },
  en: {
    'community.title': 'Food Friends',
    'community.empty': 'No friends nearby',
    'community.loading': 'Loading...',
    'community.chat_button': 'Start Chat',
  },
}
```

### 에러 처리
```typescript
// 목업 모드는 에러 없음 (항상 성공)
// 실제 모드에서만 에러 처리
if (!USE_MOCK_DATA) {
  try {
    // DB 쿼리
  } catch (error) {
    console.error('[Community] Load failed:', error);
    Alert.alert('오류', '밥친구 목록을 불러올 수 없습니다.');
  }
}
```

---

## 🎯 완성 체크리스트

### 구현
- [ ] `USE_MOCK_DATA` Feature Flag 추가
- [ ] `MOCK_USERS` 8명 데이터 작성
- [ ] `useUserCards` 조건부 로직 구현
- [ ] 필터링 로직 (예산, 식단, 거리)
- [ ] 목업 뱃지 UI 추가
- [ ] 채팅 버튼 목업 처리

### 디자인
- [ ] 카드 스타일 일관성 확인
- [ ] 색상 팔레트 적용
- [ ] 타이포그래피 적용
- [ ] 간격 시스템 적용
- [ ] Avatar 스타일 확인
- [ ] Tag 스타일 확인

### 테스트
- [ ] 초기 로딩 확인
- [ ] 스크롤 부드러움
- [ ] 카드 인터랙션
- [ ] 채팅 버튼 Alert
- [ ] 필터링 작동
- [ ] 빈 목록 표시
- [ ] 목업 뱃지 표시

### 문서화
- [x] 계획 문서 작성
- [ ] 코드 주석 추가
- [ ] 전환 가이드 작성
- [ ] 테스트 결과 기록

---

## 📌 참고사항

### Git Commit 전략
```bash
# Feature Flag & 목업 데이터 추가
git add hooks/useCommunity.ts
git commit -m "feat: 밥친구 탭 목업 데이터 추가 (Feature Flag)"

# UI 개선
git add app/(tabs)/community.tsx
git commit -m "feat: 밥친구 탭 목업 뱃지 및 Alert 추가"

# 문서화
git add COMMUNITY_MOCK_PLAN.md
git commit -m "docs: 밥친구 탭 목업 구현 계획 문서 작성"
```

### 코드 리뷰 포인트
1. ✅ USE_MOCK_DATA 플래그 사용
2. ✅ 타입 안전성 (Profile 타입 준수)
3. ✅ 기존 코드 영향 최소화
4. ✅ 쉬운 전환 (true/false 토글)
5. ✅ 주석으로 목업 코드 표시

### 주의사항
- ⚠️ USE_MOCK_DATA는 개발용이므로 프로덕션 전에 반드시 false로
- ⚠️ 목업 데이터의 개인정보는 실제와 무관하도록
- ⚠️ 필터링 로직은 실제와 동일하게 구현 (테스트 목적)

---

**문서 작성**: 2025-10-18  
**최종 수정**: 2025-10-18  
**상태**: 🟢 구현 준비 완료
