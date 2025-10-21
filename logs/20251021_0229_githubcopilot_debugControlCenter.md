# [2025-10-21 02:29 KST] 종합 디버그 컨트롤 센터 구현

> **Agent**: GitHub Copilot  
> **Objective**: 기존 단일 Supabase 디버그 화면을 7개 카테고리를 가진 종합 디버그 컨트롤 센터로 확장

---

## 📋 요구사항 분석

### 사용자 요청
1. **UI 개선**: 설정 페이지의 디버그 버튼을 iPhone 스타일로 재디자인
   - "목업 버튼처럼 존재감 없는듯 보이긴 하게 단정하게"
   - 투명 배경, 얇은 테두리, 연한 회색 텍스트

2. **기능 확장**: 단일 Supabase 테스트를 종합 디버그 센터로 확장
   - "최대한 많은 분류의 디버그들을 실행할 수 있게"
   - "실제로 필요한 로그 모조리 불러오는 기능"
   - "신중히 서버와의 어떤 통신의 어떤 로그들 불러올지 체계적으로 고민"

---

## 🎯 설계 결정사항

### 디버그 카테고리 분류 (7가지)

#### 1. **인증 & 세션 (Auth & Session)**
- 현재 세션 상태 조회 (`supabase.auth.getSession()`)
- 토큰 만료 시간 확인 및 알림
- AsyncStorage 키 존재 여부 검증
- 프로필 데이터 무결성 체크 (display_name, location 등)

#### 2. **네트워크 연결 (Network & Connectivity)**
- Supabase REST API 연결 테스트 (기존 기능 개선)
- HTTP 응답 시간 측정 및 평가 (<200ms: 빠름, 200-500ms: 양호, 500-1000ms: 느림, >1000ms: 매우 느림)
- 에러 핸들링 및 상세 로깅

#### 3. **데이터베이스 (Database Queries)**
- Profiles 테이블 쿼리 테스트
- Threads/Messages RLS 정책 검증 (본인 데이터만 조회되는지 확인)
- Storage bucket 목록 조회

#### 4. **실시간 구독 (Realtime Subscriptions)**
- 현재 활성 Supabase 채널 상태 확인
- 채팅 스토어 스레드 개수 확인
- 테스트 채널 생성 → 브로드캐스트 이벤트 전송 → 수신 확인 → 구독 해제

#### 5. **위치 & 지도 (Location & Map)**
- 위치 권한 상태 확인 (`Location.getForegroundPermissionsAsync()`)
- 현재 위치 정보 존재 여부 확인
- 지도 테마 상태 (light/dark) 로깅
- Google Places API 키 환경 변수 확인 (웹 전용)

#### 6. **스토리지 (Storage)**
- Storage bucket 목록 조회
- photos bucket 파일 목록 조회 시도 (RLS 제한 확인)
- AsyncStorage 관련 키 개수 및 목록

#### 7. **로그 관리 (Log Management)**
- 전역 로그 수집 (최근 100개 유지)
- 카테고리별 로그 필터링
- 로그 클립보드 복사 (공유 기능)
- 로그 삭제 (초기화)

---

## � 추가 개선사항 (2025-10-21 02:39 KST)

### UI/UX 최적화

#### 1. 설정 페이지 디버그 버튼
**Before**: 전체 너비 텍스트 버튼
**After**: 44x44 아이콘 버튼 (Wrench 아이콘)
- 중앙 정렬, 정사각형 라운딩
- 연한 회색 아웃라인 (#E5E5E5)
- 미니멀한 디자인

#### 2. 디버그 페이지 레이아웃 재구성
**Before**: 
- 상단에 큰 "전체 테스트 실행" 버튼
- 하단에 고정 높이(280px) 로그 섹션
- 카테고리 리스트가 중간에 위치

**After**:
- **맨 위에 "전체 테스트 실행 + 로그" 아코디언 셀**
- 다른 카테고리들과 동일한 디자인
- 펼치면 내부에 테스트 버튼과 로그 영역
- 효율적인 공간 활용

### 새로운 아코디언 셀 구조

```tsx
<View style={styles.categoryCard}>
  <TouchableOpacity onPress={toggleExpand}>
    <Icon: Activity />
    <Title: "전체 테스트 실행" />
    <Description: "모든 진단 실행 및 로그 확인" />
    <ChevronRight (90deg when expanded) />
  </TouchableOpacity>
  
  {isExpanded && (
    <View>
      {/* 컴팩트 실행 버튼 */}
      <TouchableOpacity style={runAllButtonCompact}>
        ⚡ 전체 테스트 실행
      </TouchableOpacity>
      
      {/* 로그 헤더 (내보내기/삭제 버튼) */}
      <View style={logsHeaderRow}>
        <Text>실행 로그</Text>
        <Actions: [내보내기] [삭제] />
      </View>
      
      {/* 컴팩트 로그 영역 (최대 10개, 최대 높이 200px) */}
      <ScrollView maxHeight={200} nestedScrollEnabled>
        {logs.slice(0, 10).map(log => (
          <LogItemCompact /> // 2줄 제한
        ))}
      </ScrollView>
    </View>
  )}
</View>
```

### 공간 효율성 개선

#### 로그 표시 최적화
- **Before**: 전체 로그 표시, 고정 280px 높이
- **After**: 최근 10개만 표시, 최대 200px 높이
- **메시지**: 2줄 제한 (`numberOfLines={2}`)
- **상세 정보**: 제거 (간결한 표시)

#### 버튼 크기 축소
- **Before**: `paddingVertical: 14`, `fontSize: 16`
- **After**: `paddingVertical: 12`, `fontSize: 14`
- 아코디언 내부에서 압축된 디자인

#### 헤더 액션 통합
- 로그 내보내기/삭제 버튼을 헤더 우측에 배치
- 별도 버튼 영역 불필요

### 새로운 스타일 추가

```typescript
allTestsContent: 내부 컨텐츠 패딩
runAllButtonCompact: 압축된 실행 버튼
runAllTextCompact: 작은 폰트 텍스트
logsHeaderRow: 로그 헤더 가로 배치
logsHeaderTitle: 로그 제목
logsHeaderActions: 우측 버튼 그룹
logsHeaderButton: 내보내기/삭제 버튼
logsHeaderButtonText: 버튼 텍스트
logsContainerCompact: 압축된 로그 컨테이너
logItemCompact: 압축된 로그 아이템
logMessageCompact: 2줄 제한 메시지
```

### 제거된 스타일

```typescript
runAllButton (독립 버튼 → 셀 내부로 이동)
runAllText
logsSection (고정 하단 영역 제거)
logsSectionHeader
logsSectionTitle
logsCount
logsContainer
logsContent
logItem (→ logItemCompact)
logTimestamp (제거)
logMessage (→ logMessageCompact)
logDetails (제거)
```

---

## �🛠️ 구현 세부사항

### 파일 변경사항

#### 1. `app/(tabs)/settings.tsx`
**Before**:
```tsx
debugButton: {
  marginHorizontal: 16,
  marginBottom: 32,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: '#1F2937',  // 어두운 회색 배경
  alignItems: 'center',
},
debugText: {
  color: '#F9FAFB',           // 밝은 흰색 텍스트
  fontSize: 15,
  fontWeight: '600',
},
```

**After** (iPhone 스타일):
```tsx
debugButton: {
  marginHorizontal: 16,
  marginBottom: 32,
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderRadius: 8,
  backgroundColor: 'transparent',  // 투명 배경
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E5E5E5',          // 얇은 회색 테두리
},
debugText: {
  color: '#8E8E93',                // iOS 시스템 회색
  fontSize: 13,
  fontWeight: '500',
  letterSpacing: -0.08,            // 네이티브 iOS 자간
},
```

**Button Text 변경**:
- Before: "Supabase 디버그 실행"
- After: "개발자 도구"

#### 2. `app/debug/index.tsx` (신규 생성, ~700줄)

**주요 컴포넌트 구조**:
```tsx
interface DebugLog {
  timestamp: string;
  category: DebugCategory;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
}

const CATEGORY_CONFIG = {
  auth: { icon: Shield, title: '인증 & 세션', color: '#10B981' },
  network: { icon: Activity, title: '네트워크 연결', color: '#3B82F6' },
  database: { icon: Database, title: '데이터베이스', color: '#8B5CF6' },
  realtime: { icon: Radio, title: '실시간 구독', color: '#F59E0B' },
  location: { icon: MapPin, title: '위치 & 지도', color: '#EF4444' },
  storage: { icon: HardDrive, title: '스토리지', color: '#06B6D4' },
  logs: { icon: FileText, title: '로그 관리', color: '#6B7280' },
};
```

**UI 레이아웃**:
1. **헤더**: "개발자 도구" 타이틀 + 부제목
2. **전체 테스트 실행 버튼**: 7개 카테고리 순차 실행
3. **카테고리 카드 목록**: 접고 펼칠 수 있는 아코디언 스타일
4. **로그 섹션**: 하단 고정, 280px 높이, 스크롤 가능

**주요 기능**:
- `addLog()`: 타임스탬프, 카테고리, 레벨, 메시지, 상세 정보를 포함한 로그 추가
- `testAuth()`: 세션, 토큰, AsyncStorage, 프로필 검증
- `testNetwork()`: REST API 연결, 응답 시간 측정
- `testDatabase()`: Profiles/Threads 쿼리, Storage bucket 조회
- `testRealtime()`: 채널 상태, 테스트 브로드캐스트
- `testLocation()`: 위치 권한, 현재 위치, 지도 테마, Places API 키
- `testStorage()`: Bucket 목록, photos 접근, AsyncStorage 키
- `handleExportLogs()`: 로그 클립보드 복사 (타임스탬프, 카테고리, 레벨 포함)
- `handleClearLogs()`: 로그 전체 삭제 (확인 다이얼로그)
- `handleRunAllTests()`: 모든 테스트 500ms 간격으로 순차 실행

**디자인 특징**:
- **다크 테마**: 배경 `#0A0A0B`, 카드 `#1A1A1C`
- **카테고리별 색상 코딩**: 각 카테고리마다 고유 색상 (아이콘, 배지)
- **로그 레벨 시각화**: INFO(회색), SUCCESS(녹색), WARNING(주황), ERROR(빨강)
- **모노스페이스 타임스탬프**: Menlo (iOS) / monospace (Android)
- **햅틱 피드백**: 성공/오류/선택 시 진동 알림

#### 3. `app/auth/login.tsx`
**라우팅 변경**:
```tsx
// Before
const handleOpenDebug = React.useCallback(() => {
  router.push('/debug/supabase');
}, []);

// After
const handleOpenDebug = React.useCallback(() => {
  router.push('/debug');
}, []);
```

#### 4. `app/_layout.tsx`
**StatusBar 다크 모드 라우트 업데이트**:
```tsx
// Before
const DARK_BACKGROUND_ROUTES = [
  '/debug/supabase',
  // ...
];

// After
const DARK_BACKGROUND_ROUTES = [
  '/debug',  // 새로운 디버그 컨트롤 센터
  // ...
];
```

---

## 🐛 발생한 오류 및 해결

### 오류 1: TypeScript 컴파일 에러
**문제**:
```tsx
{log.details && (
  <Text>{JSON.stringify(log.details, null, 2)}</Text>
)}
// Error: Type 'unknown' is not assignable to type 'ReactNode'
```

**원인**: `log.details`가 `unknown` 타입이라 직접 JSX에 렌더링 불가

**해결**:
```tsx
const detailsText = log.details 
  ? (typeof log.details === 'string' 
      ? log.details 
      : JSON.stringify(log.details, null, 2))
  : null;

// 사용:
{detailsText && <Text>{detailsText}</Text>}
```

### 오류 2: React import 누락
**문제**: `View` 컴포넌트 타입 오류

**해결**: 
```tsx
// Before
import { useState, useCallback, useMemo } from 'react';

// After
import React, { useState, useCallback, useMemo } from 'react';
```

---

## ✅ 검증 체크리스트

- [x] TypeScript 컴파일 에러 없음
- [x] 설정 페이지 디버그 버튼 iPhone 스타일 적용
- [x] 7개 카테고리 모두 독립적으로 실행 가능
- [x] 전체 테스트 실행 버튼 동작
- [x] 로그 수집 및 필터링 (카테고리별)
- [x] 로그 클립보드 복사 기능
- [x] 로그 삭제 기능 (확인 다이얼로그)
- [x] 햅틱 피드백 모든 액션에 적용
- [x] 다크 테마 StatusBar 설정 (app/_layout.tsx)
- [x] 라우팅 `/debug/supabase` → `/debug` 변경
- [x] 아코디언 스타일 카테고리 확장/축소
- [x] 로딩 상태 표시 (테스트 실행 중)

---

## 📊 코드 메트릭스

- **신규 파일**: 1개 (app/debug/index.tsx)
- **수정 파일**: 3개 (settings.tsx, login.tsx, _layout.tsx)
- **총 코드 라인**: ~730줄 (신규 index.tsx)
- **삭제 파일**: 없음 (기존 supabase.tsx 보존 가능)
- **디버그 카테고리**: 7개
- **테스트 함수**: 6개 + 1개 로그 관리
- **상태 관리**: useState (logs, expandedCategory, runningTests)

---

## 🎨 디자인 시스템

### 색상 팔레트
- **배경**: `#0A0A0B` (메인), `#1A1A1C` (카드), `#0F0F10` (로그)
- **텍스트**: `#FFFFFF` (타이틀), `#E5E7EB` (본문), `#9CA3AF` (보조), `#6B7280` (비활성)
- **카테고리 색상**:
  - Auth: `#10B981` (녹색)
  - Network: `#3B82F6` (파란색)
  - Database: `#8B5CF6` (보라색)
  - Realtime: `#F59E0B` (주황색)
  - Location: `#EF4444` (빨간색)
  - Storage: `#06B6D4` (청록색)
  - Logs: `#6B7280` (회색)

### 타이포그래피
- **타이틀**: 28px, 700 weight, -0.5 tracking
- **카테고리**: 16px, 600 weight
- **설명**: 13px, 400 weight
- **로그 텍스트**: 13px, Menlo/monospace (타임스탬프)

### 간격 및 레이아웃
- **패딩**: 16px (표준), 12px (압축)
- **카드 간격**: 12px
- **BorderRadius**: 12px (카드), 8px (버튼), 4px (배지)
- **로그 섹션 높이**: 280px (고정)

---

## 🚀 향후 개선 가능 사항

1. **로그 필터링 고도화**:
   - 날짜/시간 범위 선택
   - 로그 레벨별 필터 (INFO, SUCCESS, WARNING, ERROR)
   - 키워드 검색

2. **로그 내보내기 확장**:
   - 파일로 저장 (JSON, TXT)
   - 이메일 전송
   - 슬랙/디스코드 웹훅 연동

3. **추가 디버그 카테고리**:
   - Performance Monitoring (렌더링 시간, 메모리 사용량)
   - Network Throttling 시뮬레이션
   - Mock Data Toggle (커뮤니티, 지도)

4. **실시간 로그 스트리밍**:
   - 전역 console.log 인터셉트
   - 앱 전체 에러 경계 로그 수집
   - Supabase 네트워크 요청 자동 로깅

5. **시각화**:
   - 응답 시간 차트 (라인 그래프)
   - 로그 레벨 분포 (파이 차트)
   - 카테고리별 테스트 성공률

---

## 📝 기술적 노트

### Supabase Realtime 채널 테스트
- `supabase.channel()` 생성 후 `subscribe()` 호출
- 상태: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`
- 브로드캐스트 이벤트로 ping-pong 테스트
- 테스트 후 `removeChannel()`로 정리 (메모리 누수 방지)

### AsyncStorage 키 패턴
- `sb-eatingmeeting-auth`: Supabase 세션 토큰
- `supabase.*`: Supabase SDK 관련 키
- 앱 전체 키 스캔하여 관련 항목만 필터링

### 햅틱 피드백 패턴
```tsx
await Haptics.notificationAsync(
  result ? NotificationFeedbackType.Success : NotificationFeedbackType.Error
);
await Haptics.selectionAsync();  // 가벼운 탭
```

### 로그 최적화
- 최근 100개 로그만 메모리 보관 (`.slice(0, 100)`)
- 역순 표시 (최신 로그가 위로)
- JSON.stringify 3줄 제한 (`numberOfLines={3}`)

---

## 🎯 결과

### Before
- 단일 Supabase REST API 테스트 화면
- 어두운 배경의 눈에 띄는 버튼
- 제한적인 진단 기능

### After
- **7개 카테고리** 종합 디버그 컨트롤 센터
- **iPhone 스타일** 미니멀한 버튼 디자인
- **체계적인 로그 수집** 및 내보내기
- **실시간 구독 테스트** 추가
- **위치/지도 진단** 추가
- **스토리지 검증** 추가
- **전역 로그 관리** 시스템

### 기대 효과
1. **개발 생산성 향상**: 문제 진단 시간 단축
2. **운영 효율성**: 사용자 이슈 리포트 시 빠른 대응
3. **확장성**: 새로운 디버그 카테고리 추가 용이
4. **사용자 경험**: 설정 페이지 UI 깔끔하게 개선

---

**최종 커밋 메시지**:
```
feat: 종합 디버그 컨트롤 센터 구현

- 7개 카테고리 디버그 시스템 (인증, 네트워크, DB, 실시간, 위치, 스토리지, 로그)
- 설정 페이지 디버그 버튼 iPhone 스타일 리디자인
- 전역 로그 수집 및 클립보드 내보내기
- 카테고리별 독립 실행 + 전체 테스트 실행
- 햅틱 피드백 및 다크 테마 적용
```
