# Log: Map List UI Refinement - Star Fix + Accordion Simplification + Mock Profiles

**Agent:** GitHub Copilot  
**Timestamp:** 20251021_0017  
**Branch:** main  
**Commit:** (pre-commit)

---

## Purpose

Fix FilledStar rendering issue with orange box overlay, simplify accordion design for cleaner collapsed state, and add mock profile data for interested participants section using pravatar.cc style matching 밥친구 page aesthetic.

## Files Modified

1. **components/FilledStar.tsx** (REFACTORED)
   - Removed LinearGradient approach causing orange box rendering issue
   - Implemented simple opacity-based star fill
   
2. **app/map/list.tsx** (MAJOR CHANGES)
   - Added MOCK_INTERESTED_PROFILES array (4 profiles)
   - Refactored RestaurantCard component structure
   - Updated StyleSheet definitions
   - Removed usePlaceParticipants hook dependency

---

## Summary

### Problem
User reported three UI issues after Hook error was fixed:
1. **FilledStar rendering** - 별이 주황색 네모박스에 가려지는 문제
2. **Accordion design** - 접은 상태가 복잡함, 심플하게 만들 필요
3. **Mock participant data** - 관심있는 사람들 섹션에 밥친구 페이지 스타일 mock 데이터 필요

### Solution
- **FilledStar simplification**: Replaced complex LinearGradient masking with simple opacity property (5-star=100% opacity, 3-star=60% opacity, 0-star=0% opacity)
- **Accordion simplification**: Wrapped entire card in TouchableOpacity for full card tap, removed ratingContainer wrapper, adjusted icon sizes (star 24→22px, chevron 20→18px), changed chevron color to #999999 for subtler appearance
- **Mock profile integration**: Created MOCK_INTERESTED_PROFILES array with 4 profiles (김철수, 이영희, 정수연, 박민수) using pravatar.cc images, complete Photo object structure with all required fields

### Metro Bundler Cache Issue
After refactoring, Metro showed old errors referencing removed `usePlaceParticipants` hook. Resolved by clearing cache with `npx expo start --clear`.

---

## Key Diff

### 1. FilledStar Component Simplification

**File:** `components/FilledStar.tsx`

**Problem:** LinearGradient approach caused orange rectangular box to obscure star icon

**Solution:** Replaced complex LinearGradient masking with simple opacity property

```tsx
// BEFORE (problematic)
<LinearGradient 
  colors={...} 
  locations={[0, fillPercentage / 100, fillPercentage / 100, 1]}
>
  <Star fill="#FF6B35" />
</LinearGradient>

// AFTER (fixed)
<View style={{ width: size, height: size }}>
  <Star
    size={size}
    fill="#FF6B35"
    color="#FF6B35"
    opacity={fillPercentage / 100}  // Simple opacity fade
  />
</View>
```

**Rationale:** 
- Opacity-based approach avoids complex gradient masking issues
- 5-star rating = 100% opacity, 3-star = 60% opacity, 0-star = 0% opacity
- Cleaner implementation, fewer edge cases

---

### 2. Mock Profile Data Creation

**File:** `app/map/list.tsx`

**Added:** `MOCK_INTERESTED_PROFILES` array with 4 profiles

```tsx
const MOCK_INTERESTED_PROFILES: Profile[] = [
  {
    id: 'mock-interest-1',
    display_name: '김철수',
    bio: '맛집 탐방 좋아해요',
    diet_tags: ['한식'],
    budget_range: '1만원-2만원',
    time_slots: ['평일 저녁'],
    approx_lat: 37.5665,
    approx_lng: 126.9780,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primaryPhoto: {
      id: 'mock-photo-1',
      user_id: 'mock-interest-1',
      url: 'https://i.pravatar.cc/150?img=12',
      is_primary: true,
      created_at: new Date().toISOString(),
    },
  },
  // ... 3 more profiles (이영희, 정수연, 박민수)
  // Images: pravatar.cc/150?img=12,45,23,33
];
```

**Key Features:**
- Complete Profile type structure (all required fields)
- primaryPhoto as full Photo object (id, user_id, url, is_primary, created_at)
- pravatar.cc images matching 밥친구 page aesthetic
- Varied personas (김철수, 이영희, 정수연, 박민수)

---

### 3. RestaurantCard Component Refactor

**File:** `app/map/list.tsx`

**Structural Changes:**
- Wrapped entire card in `TouchableOpacity` (full card clickable)
- Removed `ratingContainer` wrapper (cleaner layout)
- Adjusted icon sizes: star 24→22px, chevron 20→18px
- Changed chevron color: #666666→#999999 (subtler)
- Integrated mock data: `MOCK_INTERESTED_PROFILES.slice(0, Math.floor(Math.random() * 5))`

```tsx
function RestaurantCard({ item, isExpanded, onPress, onToggleExpand }: RestaurantCardProps) {
  const interestedPeople = MOCK_INTERESTED_PROFILES.slice(0, Math.floor(Math.random() * 5));
  
  return (
    <TouchableOpacity
      style={styles.listItemWrapper}
      onPress={() => onPress(item)}
      activeOpacity={0.95}
    >
      <View style={styles.listItem}>
        {/* Name, address */}
        <View style={styles.rightSection}>
          <FilledStar rating={item.rating} size={22} />
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); onToggleExpand(item.id); }}>
            <Animated.View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
              <ChevronDown size={18} color="#999999" strokeWidth={2} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
      
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Category, review count, interested people */}
          <OverlappingAvatars participants={interestedPeople} maxVisible={3} size={36} />
        </View>
      )}
    </TouchableOpacity>
  );
}
```

**Interaction Model:**
- Full card tap → navigate to place detail
- Chevron tap → expand/collapse accordion (with `stopPropagation`)
- Chevron rotates 180° when expanded (smooth animation)

---

### 4. StyleSheet Cleanup

**File:** `app/map/list.tsx`

**Removed Styles:**
- `ratingContainer` - no longer needed (star rendered directly)
- `ratingText` - unused

**Simplified Styles:**
- `listItem` - removed border/background (moved to `listItemWrapper`)
- `expandedContent` - adjusted padding and border color for consistency

```tsx
// Before
listItem: {
  padding: 16,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E5E5',
},

// After (cleaner)
listItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
},

// Wrapper handles visual styling
listItemWrapper: {
  marginBottom: 12,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E5E5',
  overflow: 'hidden',
},
```

---

## Design Decisions

### Color Palette & Styling
- **Star rating**: 22px size (reduced from 24px) for better visual balance
- **Chevron icon**: 18px size, #999999 color (reduced from 20px, #666666) for subtler appearance
- **Avatar size**: 36px in expanded content (increased from 32px)
- **Border colors**: Consistent #E5E5E5 throughout card

### Layout Hierarchy
- **TouchableOpacity wrapper**: Full card clickable for better UX
- **Collapsed state**: Minimal visual cues (name, address, rating, chevron only)
- **Expanded state**: Category info, review count, interested participants
- **Stop propagation**: Chevron tap handled separately from card tap

### Mock Data Randomization
- Current: `Math.floor(Math.random() * 5)` gives 0-4 people per card
- Allows testing of "no interested people" empty state
- Alternative considered: Always show 1-3 people for better visual consistency

---

## Issues Encountered & Solutions

### 1. Metro Bundler Cache Issue

**Symptom:** After edits, Metro showed old errors:
```
ERROR  [Error: Invalid hook call...] usePlaceParticipants
ERROR  SyntaxError: Unexpected token (156:16)
ERROR  Expected corresponding JSX closing tag for <TouchableOpacity>
```

**Root Cause:** Metro bundler cached old version of `list.tsx` with `usePlaceParticipants` hook

**Solution:** 
```bash
pkill -f "expo start"  # Kill running server
npx expo start --clear  # Clear cache and restart
```

**Lesson:** When refactoring components, always clear Metro cache if old errors persist

---

### 2. Type Error: primaryPhoto Structure

**Symptom:**
```
Type '{ url: string; }' is missing the following properties from type 'Photo': 
id, user_id, is_primary, created_at
```

**Root Cause:** Profile type expects `primaryPhoto: Photo | null`, not `{ url: string }`

**Solution:** Provide complete Photo object structure in mock data

```tsx
primaryPhoto: {
  id: 'mock-photo-1',
  user_id: 'mock-interest-1',
  url: 'https://i.pravatar.cc/150?img=12',
  is_primary: true,
  created_at: new Date().toISOString(),
}
```

---

### 3. JSX Tag Mismatch

**Symptom:**
```
SyntaxError: Expected corresponding JSX closing tag for <TouchableOpacity>. (197:4)
> 197 |     </View>
```

**Root Cause:** Card wrapper changed from `<View>` to `<TouchableOpacity>`, but closing tag not updated

**Solution:** Changed `</View>` → `</TouchableOpacity>` at function end

---

## Technical Details

### React Hooks Rules Compliance

**Before (violation):**
```tsx
<FlatList
  renderItem={({ item }) => {
    const { participants } = usePlaceParticipants(item.id);  // ❌ Hook in callback
    return <View>...</View>;
  }}
/>
```

**After (compliant):**
```tsx
function RestaurantCard({ item }: Props) {
  // ✅ Hook at component top level
  const interestedPeople = MOCK_INTERESTED_PROFILES.slice(0, Math.floor(Math.random() * 5));
  return <TouchableOpacity>...</TouchableOpacity>;
}

<FlatList
  renderItem={({ item }) => (
    <RestaurantCard item={item} ... />  // ✅ Component call
  )}
/>
```

---

### Mock Data Randomization

**Current Implementation:**
```tsx
const interestedPeople = MOCK_INTERESTED_PROFILES.slice(0, Math.floor(Math.random() * 5));
// Result: 0-4 people per card
```

**Potential Improvement:**
```tsx
const interestedPeople = MOCK_INTERESTED_PROFILES.slice(
  0, 
  Math.floor(Math.random() * 3) + 1  // 1-4 people (never empty)
);
```

**Trade-off:** Current approach allows "no interested people" state to be tested

---

### Accordion Animation

**Implementation:**
```tsx
const toggleExpand = (placeId: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpandedId(expandedId === placeId ? null : placeId);
};

// In component
<Animated.View
  style={{
    transform: [{
      rotate: isExpanded ? '180deg' : '0deg'
    }]
  }}
>
  <ChevronDown size={18} color="#999999" />
</Animated.View>
```

**Behavior:**
- LayoutAnimation handles height expansion (smooth)
- Animated.View handles chevron rotation (180° when expanded)
- `easeInEaseOut` preset provides natural motion

---

## Testing Notes

### TypeScript Compilation
- ✅ No type errors
- ✅ All Profile/Photo fields correctly typed
- ✅ RestaurantCard props properly defined

### React Hooks Rules
- ✅ No hooks called in loops/conditions/nested functions
- ✅ RestaurantCard component extracted (hooks at top level)

### Visual Appearance
- ⚠️ **NOT YET CONFIRMED** - Awaiting device/simulator test
- Expected outcomes:
  - FilledStar: No orange box, smooth opacity fade
  - Accordion: Clean collapsed state, informative expanded state
  - Mock avatars: Circular overlapping style matching 밥친구 page

---

## Next Steps

1. **Visual Testing** (HIGH PRIORITY)
   - Test on iOS simulator: `expo start` → Press `i`
   - Verify:
     - FilledStar opacity rendering (no orange box)
     - Accordion expansion animation smoothness
     - Mock participant avatars display correctly
     - Chevron rotation feels natural
   
2. **Mock Data Refinement** (MEDIUM PRIORITY)
   - Consider changing random range to 1-4 (always show at least 1 person)
   - Or add more diverse mock profiles (6-8 total)
   - Consider deterministic selection (based on place ID hash) for consistency

3. **Style Polish** (MEDIUM PRIORITY)
   - Review expanded content spacing
   - Test "접힌 상태는 심플하게" requirement
   - Ensure consistent padding/margins throughout card

4. **Real Data Integration** (LOW PRIORITY - FUTURE)
   - Replace `MOCK_INTERESTED_PROFILES` with actual `usePlaceParticipants` hook
   - Implement loading states
   - Handle empty state messaging

---

## Code Diff Summary

### Files Modified (2)

**1. `components/FilledStar.tsx`**
- Removed: LinearGradient approach (complex masking)
- Added: Simple opacity-based rendering
- Lines changed: ~20 lines (simplified from ~40)

**2. `app/map/list.tsx`**
- Added: `MOCK_INTERESTED_PROFILES` array (4 profiles, ~65 lines)
- Refactored: RestaurantCard component structure (~100 lines)
  - Changed wrapper: View → TouchableOpacity
  - Removed: ratingContainer wrapper
  - Adjusted: Icon sizes and colors
  - Integrated: Mock participant data
- Removed: `ratingContainer`, `ratingText` styles
- Updated: `listItem`, `expandedContent` styles
- Total changes: ~150 lines (refactor + additions)

---

## Lessons Learned

1. **Simple is better:** Opacity-based star rendering cleaner than LinearGradient masking
2. **Cache matters:** Always clear Metro cache after major refactors
3. **Type completeness:** TypeScript strict mode catches incomplete object structures early
4. **Component extraction:** Separating `RestaurantCard` improves readability and hooks compliance
5. **Touch target design:** Full card clickable + separate chevron tap = good UX

---

## References & Context

- FilledStar issue: LinearGradient rendered as orange rectangle obscuring star icon
- Mock data style: pravatar.cc images matching 밥친구 page aesthetic
- User requirement: "접은 상태에서 카드 하단에 암시하는 형태 넣을 필요 없어. 심플하게"
- React Hooks Rules: https://react.dev/link/invalid-hook-call
- Related work: Previous Hook violation fix (RestaurantCard component extraction)

---

**Status:** ✅ Code changes complete, Metro cache cleared, awaiting visual testing on simulator
