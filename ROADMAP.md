# EatingMeeting - Feature Development Roadmap

> **Last Updated**: 2025-10-21  
> **Status**: Phase 1 Fixes Pending (Foundation), Phase 2 On Hold (UI)  
> **Current Sprint**: Gatherings Feature Implementation

---

## 📊 Project Overview

### Current State (70% MVP Complete)
- ✅ **Authentication & Onboarding** (100%)
- ✅ **Map Discovery with Google Places API** (95%)
- ✅ **Community Tab with MOCK/LIVE Toggle** (90%)
- ✅ **1:1 Chat with Realtime** (100%)
- ✅ **Profile Management** (100%)
- ✅ **Safety Features** (70% - block view only)
- ✅ **Debug Center** (100%)
- 🚧 **Gatherings System** (30% - foundation complete, UI pending)

### Target State (100% MVP)
- All current features polished
- Public restaurant-based gatherings fully functional
- Advanced place filters operational
- Group chat enhanced for gatherings
- Basic push notifications

---

## 🎯 Strategic Pivot: 1:1 Proposals → Public Gatherings

### Previous System (Deprecated)
```
User A → User B: "Let's eat at Restaurant X"
├─ Proposal created in slots table
├─ Accept/Decline workflow
└─ Limited to 1:1 interaction
```

**Problems**:
- ❌ Low scalability (pairwise only)
- ❌ Rejection awkwardness
- ❌ No group dynamics
- ❌ Limited discovery

### New System (Current Implementation)
```
Host creates gathering at Restaurant X (public)
    ↓
Nearby users discover via place detail screen
    ↓
Multiple users join (2-10 participants)
    ↓
Auto-created group chat for coordination
    ↓
Realtime updates for all participants
```

**Benefits**:
- ✅ Natural participation flow
- ✅ Multiple concurrent gatherings per place
- ✅ Group dynamics (2-10 people)
- ✅ Integrated chat per gathering
- ✅ Better discovery ("Who's eating here?")

---

## 📅 Development Phases

### ⚠️ Phase 1: Foundation (Fixes Pending - 2025-10-21)
**Duration**: 2 hours  
**Status**: ⚠️ Blocked (awaiting double-count & rejoin patch merge)

#### Deliverables
- [x] **Database Schema**
  - `gatherings` table (place-based public meetings)
  - `gathering_participants` table (participation tracking)
  - `threads.gathering_id` column (link to group chat)
  - Triggers (auto-update participant count, auto-close when full)
  - RLS policies (public read, host-only write)
  
- [x] **Type Definitions**
  - `DBGathering`, `DBGatheringParticipant` (db.ts)
  - `Gathering`, `GatheringParticipant`, `GatheringStatus` (models.ts)
  
- [x] **State Management**
  - `gathering.store.ts` (Zustand store)
  - Realtime subscriptions (gatherings, participants)
  - CRUD actions (create, update, delete, join, leave)
  
- [x] **Business Logic**
  - `useGathering.ts` hooks
  - `usePlaceGatherings()` - fetch by place
  - `useGatheringParticipants()` - fetch participants
  - `useMyGatherings()` - user's gatherings
  - `createGathering()` - create + auto-generate chat
  - `joinGathering()` - join + add to chat
  - `leaveGathering()` - leave + system message
  - `cancelGathering()` - host-only cancellation

> **Outstanding blockers**: `current_count` double increments on host creation, rejoin flow hits unique constraints, and realtime listeners retain users marked as `left`.

#### Files Created/Modified
- ✅ `supabase/migrations/20251021_0700_create_gatherings.sql` (169 lines)
- ✅ `state/gathering.store.ts` (157 lines)
- ✅ `hooks/useGathering.ts` (418 lines)
- ✅ `types/db.ts` (modified)
- ✅ `types/models.ts` (modified)
- ✅ `logs/20251021_2148_githubcopilot_gatheringsArchitecture.md` (documentation)

**Total**: 744 lines added

---

### 🚧 Phase 2: UI Components (In Progress)
**Duration**: 1 day  
**Priority**: 🔥 Critical  
**Status**: 📋 Planned

#### 2.1 GatheringCard Component
**File**: `components/GatheringCard.tsx`  
**Estimated**: 150 lines, 30 mins  
**Dependencies**: Avatar, Tag components

**Features**:
- Display gathering info (title, place, time)
- Host avatar and name
- Participant count badge (e.g., "2/4명")
- Status indicator (open/closed/cancelled/completed)
- OnPress navigation to detail screen

**Design**:
```
┌─────────────────────────────────────┐
│ 🍽️ 저녁 같이 드실 분!              │
│                                     │
│ 📍 메이플트리하우스                │
│ 🕐 오늘 오후 7:00                   │
│ 👤 김철수 (호스트)                  │
│                                     │
│ 👥 2/4명 참여 중        [참여하기]  │
└─────────────────────────────────────┘
```

**Props Interface**:
```typescript
interface GatheringCardProps {
  gathering: Gathering;
  onPress?: (gatheringId: string) => void;
  showJoinButton?: boolean;
}
```

#### 2.2 GatheringList Component
**File**: `components/GatheringList.tsx`  
**Estimated**: 80 lines, 15 mins  
**Dependencies**: GatheringCard

**Features**:
- FlatList wrapper for GatheringCard
- Loading spinner
- Empty state ("아직 모임이 없습니다")
- Pull-to-refresh support

**Props Interface**:
```typescript
interface GatheringListProps {
  gatherings: Gathering[];
  loading?: boolean;
  emptyMessage?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}
```

---

### 🔜 Phase 3: Core Screens (Next 2-3 Days)
**Duration**: 2-3 days  
**Priority**: 🔥 Critical  
**Status**: 📋 Planned

#### 3.1 Gathering Creation Screen
**File**: `app/gathering/create.tsx`  
**Estimated**: 250 lines, 1 hour  
**Dependencies**: DateTimePicker (Expo), createGathering hook

**Features**:
- Title input (required, max 50 chars)
- Description textarea (optional, max 200 chars)
- Date picker (default: today)
- Time picker (default: current + 1 hour)
- Max participants slider (2-10, default 4)
- Place info display (auto-filled from navigation params)
- Validation before submit
- Create button → calls createGathering()
- Auto-navigate to group chat on success

**Form Fields**:
```typescript
interface CreateGatheringForm {
  title: string;              // "저녁 같이 드실 분!"
  description: string;        // "편하게 오세요~"
  scheduledAt: Date;          // DateTime picker
  maxParticipants: number;    // 2-10 slider
  // Place info from route params (read-only)
  placeId: string;
  placeName: string;
  placeAddress?: string;
  placePhotoUrl?: string;
}
```

**Navigation**:
```typescript
// From place detail screen
router.push({
  pathname: '/gathering/create',
  params: {
    placeId: 'ChIJ...',
    placeName: '메이플트리하우스',
    placeAddress: '서울특별시 용산구...',
    placePhotoUrl: 'https://...',
  }
});
```

**Validation**:
- Title: 1-50 chars, required
- ScheduledAt: Must be future time
- MaxParticipants: 2-10 range

#### 3.2 Gathering Detail Screen
**File**: `app/gathering/[id].tsx`  
**Estimated**: 300 lines, 1.5 hours  
**Dependencies**: useGatheringParticipants, Avatar, Button

**Features**:
- Gathering info card (title, description, time, place)
- Host profile section (avatar, name, bio)
- Participants grid (avatars, max 10)
- Join button (conditional rendering)
- Leave button (for participants)
- Cancel button (host only)
- Navigate to group chat button
- Realtime participant count updates

**View States**:
1. **Not Joined**: Show "참여하기" button
   - Disabled if full (current_count >= max_participants)
   - Disabled if status != 'open'
   - Disabled if already joined
   
2. **Joined (Participant)**: Show "나가기" button
   - Confirmation dialog
   - System message on leave
   
3. **Joined (Host)**: Show "모임 취소" button
   - Confirmation dialog with warning
   - Notifies all participants via chat

**UI Sections**:
```
┌─────────────────────────────────────┐
│ [← Back]           저녁 같이 드실 분! │
├─────────────────────────────────────┤
│ 📍 메이플트리하우스                │
│ 📍 서울특별시 용산구 이태원동       │
│ 🕐 2025-10-21 19:00                 │
│ 💬 편하게 오세요~                   │
├─────────────────────────────────────┤
│ 👤 호스트: 김철수                   │
│ [Avatar] 맛집 탐방을 좋아하는...    │
├─────────────────────────────────────┤
│ 👥 참가자 (2/4)                     │
│ [Avatar] [Avatar] [Empty] [Empty]   │
├─────────────────────────────────────┤
│           [참여하기]                │
│        [채팅방 입장하기]            │
└─────────────────────────────────────┘
```

#### 3.3 Place Detail Screen Integration
**File**: `app/place/[id].tsx` (modification)  
**Estimated**: 100 lines added, 30 mins  
**Dependencies**: GatheringList, usePlaceGatherings

**Changes**:
- Add "모임" tab or section below "참가자" section
- Display GatheringList with usePlaceGatherings(placeId)
- Add "모임 만들기" button (FloatingActionButton or header button)
- Navigation to gathering/create with place params

**New Sections**:
```typescript
// Add after existing participants section
<View style={styles.gatheringsSection}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>이 식당의 모임</Text>
    <TouchableOpacity onPress={handleCreateGathering}>
      <Text style={styles.createButton}>+ 만들기</Text>
    </TouchableOpacity>
  </View>
  
  <GatheringList
    gatherings={gatherings}
    loading={loading}
    emptyMessage="아직 모임이 없습니다. 첫 모임을 만들어보세요!"
  />
</View>
```

#### 3.4 Chat Thread Screen Enhancement
**File**: `app/chat/thread/[id].tsx` (modification)  
**Estimated**: 80 lines added, 30 mins  
**Dependencies**: Gathering types, system message styling

**Changes**:
1. **Detect Gathering Thread**:
   ```typescript
   const { data: thread } = await supabase
     .from('threads')
     .select('*, gathering:gatherings(*)')
     .eq('id', threadId)
     .single();
   ```

2. **Custom Header for Gathering Threads**:
   ```
   ┌─────────────────────────────────────┐
   │ [←] 저녁 같이 드실 분!  👥 2/4     │
   │     메이플트리하우스                │
   └─────────────────────────────────────┘
   ```

3. **System Message Styling**:
   - Gray background
   - Center-aligned
   - Smaller font
   - Examples:
     - "저녁 같이 드실 분! 모임이 시작되었습니다!"
     - "김철수님이 참여했습니다."
     - "이영희님이 나갔습니다."
     - "모임이 취소되었습니다."

4. **Quick Actions**:
   - "모임 정보 보기" button → Navigate to gathering/[id]
   - Show participant avatars in header (collapsed)

---

### 📅 Phase 4: Advanced Features (Week 2)
**Duration**: 3-4 days  
**Priority**: ⭐ High  
**Status**: 📋 Planned

#### 4.1 Advanced Place Filters
**File**: `app/(tabs)/index.tsx` (modification)  
**Estimated**: 200 lines added, 2 hours  
**Dependencies**: Google Places API, filter state

**Filter Categories**:

1. **Category Filter** (Multi-select)
   - 한식 (Korean)
   - 양식 (Western)
   - 중식 (Chinese)
   - 일식 (Japanese)
   - 카페 (Cafe)
   - 분식 (Korean Street Food)
   - 아시안 (Asian)

2. **Price Range Filter** (Single-select)
   - $ (저가) - 1만원 이하
   - $$ (중가) - 1-3만원
   - $$$ (고가) - 3만원 이상

3. **Rating Filter** (Single-select)
   - ⭐ 3.5+ (Good)
   - ⭐ 4.0+ (Great)
   - ⭐ 4.5+ (Excellent)

4. **Search Query** (Text input)
   - Free-text search by name
   - Debounced (500ms)

**UI Design**:
```
┌─────────────────────────────────────┐
│ [필터] 🔍 검색...         [지도/목록] │
├─────────────────────────────────────┤
│ ☰ 카테고리  💰 가격  ⭐ 평점         │
└─────────────────────────────────────┘
```

**Filter Modal**:
```
┌─────────────────────────────────────┐
│ 필터                      [초기화]  │
├─────────────────────────────────────┤
│ 카테고리                            │
│ [한식] [양식] [중식] [일식] [카페]  │
├─────────────────────────────────────┤
│ 가격 범위                           │
│ ( ) 저가  (●) 중가  ( ) 고가       │
├─────────────────────────────────────┤
│ 평점                                │
│ ( ) 3.5+  (●) 4.0+  ( ) 4.5+       │
├─────────────────────────────────────┤
│ 최대 거리                           │
│ ◀━━━━●━━━▶ 5km                     │
├─────────────────────────────────────┤
│              [적용하기]             │
└─────────────────────────────────────┘
```

**Implementation**:
```typescript
// Update map.store.ts
interface PlaceFilters {
  categories: string[];      // ['korean', 'japanese']
  priceLevel: 1 | 2 | 3 | null;
  minRating: 3.5 | 4.0 | 4.5 | null;
  maxDistance: number;       // kilometers
  searchQuery: string;
}

// Google Places API integration
const filters: GooglePlacesFilters = {
  includedTypes: filters.categories,
  minRating: filters.minRating,
  maxResultCount: 200,
};
```

#### 4.2 Group Chat Enhancements
**Estimated**: 150 lines added, 1 hour

**Features**:
1. **Typing Indicators**
   - Show "{name} is typing..." below chat input
   - Realtime broadcast via Supabase presence

2. **Read Receipts**
   - Update `members.last_read` on scroll
   - Show checkmarks on messages (sent/read)

3. **Participant List Modal**
   - Show all gathering participants
   - Tap participant → view profile
   - Host badge indicator

4. **In-Chat Actions**
   - Quick join gathering (if not joined)
   - Share gathering link (future: deep linking)

#### 4.3 My Gatherings Screen
**File**: `app/gathering/my.tsx` (new)  
**Estimated**: 200 lines, 1 hour  
**Dependencies**: useMyGatherings, GatheringList

**Tabs**:
1. **호스팅 중** - Gatherings I'm hosting
2. **참여 중** - Gatherings I've joined
3. **지난 모임** - Completed/cancelled gatherings

**Features**:
- Tab navigation
- GatheringList for each tab
- Pull-to-refresh
- Empty states per tab
- Quick actions (cancel, view chat, view details)

**Navigation Entry**:
- Add to Settings tab or Community tab
- Or add to bottom tab bar (5th tab)

---

### 🎨 Phase 5: Polish & Optimization (Week 3)
**Duration**: 2-3 days  
**Priority**: ⭐ Medium  
**Status**: 📋 Planned

#### 5.1 Animations & Transitions
**Estimated**: 100 lines, 2 hours

**Enhancements**:
1. **GatheringCard Animations**
   - Fade-in on list load (staggered)
   - Pulse effect on participant count update
   - Shake animation when trying to join full gathering

2. **Page Transitions**
   - Slide-in from right for detail screens
   - Modal presentation for creation screen
   - Smooth back navigation

3. **Loading States**
   - Skeleton placeholders for GatheringList
   - Shimmer effect on cards
   - Progress indicators for actions

#### 5.2 Error Handling & Edge Cases
**Estimated**: 150 lines, 2 hours

**Scenarios**:
1. **Network Errors**
   - Retry mechanism for failed requests
   - Offline mode detection
   - Queue actions when offline

2. **Validation Errors**
   - User-friendly error messages
   - Inline field validation
   - Toast notifications

3. **Race Conditions**
   - Optimistic updates with rollback
   - Conflict resolution (last-write-wins)
   - Duplicate join prevention

4. **Empty States**
   - No gatherings for place
   - No participants yet
   - Search no results

#### 5.3 Performance Optimization
**Estimated**: 100 lines refactoring, 2 hours

**Optimizations**:
1. **Pagination**
   - Infinite scroll for gathering lists
   - Limit initial load to 20 gatherings
   - Load more on scroll threshold

2. **Caching**
   - Cache gathering data in Zustand
   - Invalidate on realtime updates
   - Deduplicate API calls

3. **Image Optimization**
   - Lazy load place photos
   - Use thumbnails for cards
   - Cache images locally

4. **Realtime Efficiency**
   - Unsubscribe from channels when off-screen
   - Batch participant updates (debounce 500ms)
   - Limit subscription count

---

### 🔔 Phase 6: Notifications (Week 4)
**Duration**: 2-3 days  
**Priority**: ⭐ Medium  
**Status**: 📋 Planned

#### 6.1 Push Notifications Setup
**Dependencies**: Expo Notifications, Supabase Edge Functions

**Notification Types**:
1. **Gathering Lifecycle**
   - New participant joined
   - Gathering is full (closed)
   - Gathering cancelled by host
   - Gathering starting soon (1 hour before)

2. **Chat Activity**
   - New message in gathering chat
   - Host announcement
   - @mention (future feature)

**Implementation Steps**:
1. Request notification permissions (Expo Notifications)
2. Store push token in `profiles.push_token`
3. Create Supabase Edge Function for sending notifications
4. Trigger notifications on DB events (triggers/webhooks)
5. Handle notification taps (deep linking)

**Edge Function Example**:
```typescript
// supabase/functions/send-gathering-notification/index.ts
Deno.serve(async (req) => {
  const { gatheringId, event, userId } = await req.json();
  
  // Fetch participants
  const { data: participants } = await supabase
    .from('gathering_participants')
    .select('user_id, profiles(push_token)')
    .eq('gathering_id', gatheringId)
    .neq('user_id', userId); // Don't notify the actor
  
  // Send push notifications via Expo
  const messages = participants.map(p => ({
    to: p.profiles.push_token,
    title: '모임 알림',
    body: getNotificationBody(event),
    data: { gatheringId, screen: 'gathering/[id]' },
  }));
  
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  
  return new Response('OK');
});
```

#### 6.2 In-App Notifications
**File**: `components/NotificationBanner.tsx` (new)  
**Estimated**: 100 lines, 1 hour

**Features**:
- Toast-style banner at top of screen
- Auto-dismiss after 3 seconds
- Tap to navigate to relevant screen
- Queue multiple notifications

---

### 🛡️ Phase 7: Safety & Moderation (Backlog)
**Duration**: 2-3 days  
**Priority**: ⭐ Low  
**Status**: 📋 Backlog

#### 7.1 Block User in Gatherings
**Changes**:
- Filter out blocked users from gathering lists
- Prevent joining gatherings hosted by blocked users
- Auto-leave gatherings if host blocks you

#### 7.2 Report Gathering
**File**: `app/gathering/[id].tsx` (modification)

**Features**:
- "신고하기" button (3-dot menu)
- Report reasons:
  - Inappropriate content
  - Spam/fake gathering
  - Harassment
  - Safety concerns
- Store in `reports` table with `target_gathering_id`

#### 7.3 Admin Moderation Dashboard
**File**: `app/admin/` (new, web-only)

**Features**:
- View reported gatherings
- Ban users
- Delete gatherings
- View gathering analytics

---

## 🧪 Testing Strategy

### Unit Tests
**Tool**: Jest + React Native Testing Library

**Coverage Areas**:
- [ ] `useGathering.ts` hooks
- [ ] `gathering.store.ts` actions
- [ ] Form validation logic
- [ ] Date/time formatting utilities

### Integration Tests
**Tool**: Detox (E2E)

**Test Scenarios**:
1. **Create Gathering Flow**
   ```
   User opens place detail
   → Taps "모임 만들기"
   → Fills form
   → Submits
   → Redirects to group chat
   → Verify thread created
   → Verify system message sent
   ```

2. **Join Gathering Flow**
   ```
   User sees gathering card
   → Taps "참여하기"
   → Confirms join
   → Verify participant count +1
   → Verify added to chat members
   → Verify system message sent
   ```

3. **Leave Gathering Flow**
   ```
   User taps "나가기"
   → Confirms leave
   → Verify participant count -1
   → Verify system message sent
   ```

4. **Full Gathering Behavior**
   ```
   3 users join (max=4)
   → 4th user joins
   → Verify status changed to 'closed'
   → Verify 5th user cannot join
   → Verify button disabled
   ```

### Manual Testing Checklist
- [ ] Realtime updates work across devices
- [ ] Trigger fires correctly (count, status)
- [ ] RLS policies enforce permissions
- [ ] System messages render correctly
- [ ] Animations smooth on low-end devices
- [ ] Offline mode gracefully handled
- [ ] Push notifications received
- [ ] Deep links work correctly

---

## 📊 Success Metrics

### Technical KPIs
- [ ] DB migration success rate: 100%
- [ ] Realtime latency: < 500ms
- [ ] Join operation latency: < 1s
- [ ] No duplicate participants (unique constraint)
- [ ] System message delivery: 100%

### User Experience KPIs
- [ ] Time to create gathering: < 30s
- [ ] Join button disabled when full: 0ms delay
- [ ] Empty state clarity: User testing score > 4/5
- [ ] Error message clarity: User testing score > 4/5

### Business KPIs (Post-Launch)
- [ ] % gatherings reaching max_participants: Target 60%+
- [ ] Avg participants per gathering: Target 3+
- [ ] % cancelled vs completed: Target < 20% cancelled
- [ ] Repeat gathering hosts: Target 40%+
- [ ] Places with most gatherings (identify hotspots)

---

## 🗓️ Timeline Summary

| Phase | Duration | Priority | Status | ETA |
|-------|----------|----------|--------|-----|
| **Phase 1: Foundation** | 2 hours | 🔥 Critical | ✅ Complete | 2025-10-21 |
| **Phase 2: UI Components** | 1 day | 🔥 Critical | 📋 Planned | 2025-10-22 |
| **Phase 3: Core Screens** | 2-3 days | 🔥 Critical | 📋 Planned | 2025-10-24 |
| **Phase 4: Advanced Features** | 3-4 days | ⭐ High | 📋 Planned | 2025-10-28 |
| **Phase 5: Polish** | 2-3 days | ⭐ Medium | 📋 Planned | 2025-10-31 |
| **Phase 6: Notifications** | 2-3 days | ⭐ Medium | 📋 Planned | 2025-11-03 |
| **Phase 7: Safety** | 2-3 days | ⭐ Low | 📋 Backlog | TBD |

**Total Estimated Time**: 12-19 days (2.5-4 weeks)  
**Target MVP Launch**: 2025-11-15

---

## 🚀 Quick Start Guide (For Next Developer)

### Prerequisites
```bash
# Install dependencies
npm install

# Start Supabase locally (optional)
npx supabase start

# Apply gatherings migration
npx supabase db push
```

### Development Workflow
```bash
# 1. Create feature branch
git checkout -b feature/gathering-ui

# 2. Start Expo dev server
npm start

# 3. Run on device/simulator
# Press 'i' for iOS, 'a' for Android

# 4. Make changes and test

# 5. Commit with descriptive message
git add .
git commit -m "feat: Add GatheringCard component"

# 6. Push and create PR
git push origin feature/gathering-ui
```

### Code Style Guidelines
- Use TypeScript strict mode
- Follow existing component patterns (Avatar, Tag, Button)
- Add JSDoc comments for exported functions
- Use Zustand for global state, useState for local
- Prefix custom hooks with `use`
- Keep components under 300 lines (split if larger)

### Testing Locally
```bash
# Run type check
npm run typecheck

# Run linter
npm run lint

# Run unit tests (when added)
npm test

# Run E2E tests (when added)
npm run e2e
```

---

## 📚 Resources

### Documentation
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Zustand Guide](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)

### Design References
- [Material Design - Cards](https://m3.material.io/components/cards/overview)
- [Human Interface Guidelines - Lists](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- [Airbnb Experiences](https://www.airbnb.com/s/experiences) - Similar gathering model

### Database Management
- [Supabase Studio](https://app.supabase.com) - Visual database editor
- [DB Diagram Tool](https://dbdiagram.io) - ER diagram for gatherings schema

---

## 🐛 Known Issues & TODOs

### Current Blockers
- None (foundation complete)

### Technical Debt
- [ ] Add pagination to gathering lists (load 20 at a time)
- [ ] Implement optimistic updates with rollback
- [ ] Add error boundary for gathering screens
- [ ] Cache gathering data to reduce API calls
- [ ] Add analytics tracking (Mixpanel/Amplitude)

### Future Enhancements
- [ ] Recurring gatherings (weekly lunch group)
- [ ] Private gatherings (invite-only with code)
- [ ] In-chat polls for menu selection
- [ ] Calendar integration (add to device calendar)
- [ ] Gathering templates (quick create)
- [ ] Co-host feature (multiple admins)
- [ ] Waitlist when gathering is full
- [ ] Gathering ratings/reviews (post-meal)

---

## 📞 Support & Contact

### For Questions
- Check existing logs in `/logs/` folder
- Review `AGENTS.md` for context
- Consult `PROJECT_SUMMARY.md` for architecture

### For Bug Reports
- Create detailed log in `/logs/YYYYMMDD_HHmm_agent_topic.md`
- Include error messages, stack traces, reproduction steps
- Tag with severity (critical/high/medium/low)

### For Feature Requests
- Discuss in team meeting first
- Add to this roadmap with priority
- Create issue in GitHub (if applicable)

---

**Last Updated**: 2025-10-21 21:48 KST  
**Document Owner**: GitHub Copilot Agent  
**Review Cycle**: Weekly (every Monday)
