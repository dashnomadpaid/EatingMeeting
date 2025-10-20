# Documentation Discrepancy Report

정리 일시: <now>

본 문서는 `README.md`, `AGENTS.md`, `PROJECT_SUMMARY.md`에서 확인된 서술과 실제 코드베이스 사이의 괴리를 범주별로 요약합니다. 각 항목은 문서 위치와 코드 근거를 함께 제공합니다.

## 1. 기능 구현 차이

| Claim | Document refs | Reality refs | Notes |
| --- | --- | --- | --- |
| 채팅이 4인 그룹 및 이미지 전송을 지원 | `README.md:14`, `PROJECT_SUMMARY.md:36` | `hooks/useCommunity.ts:285`, `app/chat/thread/[id].tsx:75` | 신규 DM은 항상 1:1(`is_group: false`)로 생성되고, 메시지 입력창에는 이미지 첨부 로직이 없음 |
| 식사 제안(날짜/시간 선택 포함) 워크플로가 동작 | `README.md:15`, `README.md:133-141`, `AGENTS.md:30`, `PROJECT_SUMMARY.md:45-56` | `app/place/[id].tsx:102`, `hooks/useChat.ts:132` | 장소 CTA가 새 채팅 목록으로만 이동하며 제안 작성 UI나 `createProposal` 호출이 연결되어 있지 않음 |
| 커뮤니티 카드에서 즉시 DM 생성/열기 | `PROJECT_SUMMARY.md:29-33` | `hooks/useCommunity.ts:10`, `app/(tabs)/community.tsx:15` | `USE_MOCK_DATA`가 기본값으로 `true`라 목업 경고만 뜨고 실제 DM 열기 로직이 실행되지 않음 |

## 2. 안전 및 모더레이션 관련 서술

| Claim | Document refs | Reality refs | Notes |
| --- | --- | --- | --- |
| 사용자 차단/신고 기능이 앱 내에서 제공 | `README.md:18`, `README.md:145-148`, `PROJECT_SUMMARY.md:65-69` | `app/settings/blocked-users.tsx:1`, `hooks/useCommunity.ts:238` | 차단 해제 목록만 존재하며 차단/신고 생성 UI나 로직이 없음 |
| `lib/moderation.ts`에 모더레이션 플레이스홀더 존재 | `README.md:185` | (파일 부재) | 현재 `lib/`에는 `telemetry.ts`, `maps.ts` 등만 존재하며 `lib/moderation.ts` 파일이 없음 |

## 3. 사용자 흐름 및 설정 설명

| Claim | Document refs | Reality refs | Notes |
| --- | --- | --- | --- |
| 온보딩이 연령 확인 → 위치 요청 → 프로필 작성 3단계 | `AGENTS.md:24`, `PROJECT_SUMMARY.md:16` | `app/auth/onboarding.tsx:10` | 현재 온보딩은 위치 권한 확인과 기본 프로필 입력만 구성되어 있음 |
| 프로필 관리에서 식단/예산/시간대 설정 수정 가능 | `README.md:17` | `app/profile/edit.tsx:10` | 편집 화면은 닉네임과 소개만 수정 가능 |

## 4. 데이터 소스 및 연동 정보

| Claim | Document refs | Reality refs | Notes |
| --- | --- | --- | --- |
| 지도/발견 탭이 45개 서울 목업 데이터 기반 | `AGENTS.md:25`, `AGENTS.md:95-96`, `PROJECT_SUMMARY.md:22-27`, `PROJECT_SUMMARY.md:147-148` | `services/places.google.ts:27`, `app/(tabs)/index.tsx:361` | 기본 동작은 Google Places API 실데이터를 사용하고, 실패 시에만 목업으로 폴백 |
| Expo 푸시 토큰을 등록 및 저장하고 있음 | `README.md:181`, `PROJECT_SUMMARY.md:145-146` | (실제 구현 부재) | `app/`/`hooks/` 어디에서도 `expo-notifications`를 호출하거나 푸시 토큰을 저장하지 않음 |

## 5. 메트릭 및 수치 정보

| Claim | Document refs | Reality refs | Notes |
| --- | --- | --- | --- |
| 컴포넌트 5개, 훅 4개, 유틸 6개 등의 파일 수치 | `PROJECT_SUMMARY.md:100-104` | `components/BackButton.tsx:1`, `components/ScreenHeader.tsx:1`, `hooks/usePlaceParticipants.ts:1` | 디렉터리에 신규 파일들이 추가되어 문서의 개수 정보가 최신 상태와 다름 |
