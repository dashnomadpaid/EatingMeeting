# Repository Context Snapshot

## Root Layout
- `app/` – Expo Router screens (auth, tab group, feature stacks)
- `components/` – Shared UI widgets (buttons, avatars, proposal cards, etc.)
- `hooks/` – Domain hooks (auth/session, chat, community, map, framework readiness)
- `lib/` – Utilities (Supabase client, geo helpers, storage, validations, mock place data)
- `state/` – Zustand stores (`auth.store`, `chat.store`, `community.store`, `map.store`)
- `types/` – Shared typings for DB entities and view models
- `supabase/` – SQL migrations + RLS policies
- `assets/` – Images and icon placeholders
- Config: `app.json`, `package.json`, `tsconfig.json`, `expo-env.d.ts`

## Navigation & Routing
- `app/_layout.tsx` enforces auth/onboarding redirect logic and registers stack routes:
  - `(tabs)`, `auth/login`, `auth/onboarding`, `chat/new`, `chat/thread/[id]`, `place/[id]`, `profile/edit`, `profile/photos`, `settings/blocked-users`
- `app/(tabs)/_layout.tsx` sets up the four-tab bottom navigator (Discover, Community, Chat, Settings) with safe-area-aware tab bar sizing.

## Feature Screens (By Folder)
- `app/auth/` – OTP login + multi-step onboarding (age confirmation, location prompt, profile form)
- `app/(tabs)/index.tsx` – Map/list hybrid discover view with mock places and filters
- `app/(tabs)/community.tsx` – Nearby user cards and “start chat” cta
- `app/(tabs)/chat.tsx` – Thread list with last message preview
- `app/(tabs)/settings.tsx` – Profile summary, navigation to edit/photos, safety links, logout flow
- `app/chat/` – New chat picker and threaded chat UI with message composer
- `app/place/[id].tsx` – Place detail + proposal flow modal
- `app/profile/` – Edit profile form and photo management grid
- `app/settings/blocked-users.tsx` – Block list management
- `app/+not-found.tsx` – 404 fallback

## State & Data Flow
- `state/auth.store.ts` – Holds Supabase session/profile; integrates profile photo fetch during initialization.
- `hooks/useAuth.ts` – Wraps auth store init + Supabase auth state listener, exposes OTP email helpers.
- `state/chat.store.ts` + `hooks/useChat.ts` – Thread/message/proposal caches and realtime subscriptions.
- `state/community.store.ts` + `hooks/useCommunity.ts` – Filters, pagination, DM creation helper.
- `state/map.store.ts` + `hooks/useMap.ts` – Current location, place filters, mock place derivation.

## Supabase Integration
- `lib/supabase.ts` – Initializes client with AsyncStorage auth persistence.
- `supabase/migrations/...sql` – Schema for `profiles`, `photos`, `threads`, `members`, `messages`, `slots`, `blocks`, `reports` + RLS policies and triggers.
- Storage helpers in `lib/storage.ts` handle image compression/upload/removal against Supabase buckets.

## Utilities & Types
- `lib/geo.ts` – Distance calculations, location obscuring, validation helpers.
- `lib/places.ts` – Mock place catalog, filtering utilities, (budget/category translation helpers).
- `lib/maps.ts` – Region calculation for map viewports.
- `lib/validation.ts` – Form/message validation rules used across flows.
- `types/` – `db.ts` mirrors Supabase tables; `models.ts` augments with view-model fields (photos, threads, filters, etc.).

## Component Library
- `components/Button.tsx` – Variant-aware CTA button.
- `components/Avatar.tsx` – Initials fallback avatar.
- `components/Tag.tsx` – Typed label chips for category/budget/diet tags.
- `components/ChatBubble.tsx` – Message/attachment rendering and timestamps.
- `components/ProposalCard.tsx` – Meal proposal UI, action buttons, status color coding.
- `components/NativeMap.native.tsx` & `.web.tsx` – Platform-specific map wrappers.

## Build & Tooling
- Expo SDK 54 project with Expo Router (6.x) entry point.
- TypeScript project (`tsconfig.json`) and linting via `expo lint`.
- Package dependencies include Supabase JS client, Zustand, date-fns, react-native-maps, lucide icons, Expo modules for location/camera/image picker, etc.

## Auth & Onboarding Flow Highlights
- Login uses Supabase email OTP (`sendOTP`, `verifyOTP`) then routes into tabs.
- Onboarding collects minimal profile info, upserts Supabase `profiles` row, updates auth store, then navigates to tabs.
- Root layout redirects guests to login and users without `profile` to onboarding (handled via store state).

## Chat & Proposal Flow Highlights
- Threads resolved by membership; each thread query enriches with participant profiles.
- Realtime subscriptions push new messages and proposal updates into Zustand store.
- Proposal actions (create/respond/cancel) emit corresponding system messages for context.

## Map & Places
- Location stored as rounded coordinates for privacy.
- `useNearbyPlaces` filters 45-item mock dataset by distance/category/budget/search.
- Discover screen toggles between map markers and list cards; place detail offers proposal flow.

## Safety & Profile Management
- Settings screen links to edit profile, photo management, and blocked users.
- Photo manager handles uploads (with compression) and deletions via Supabase storage and DB.
- Block list retrieves `blocks` records and allows unblock actions.

## Additional Context (2025-02-15)

### Authentication & Routing
- `app/_layout.tsx` pairs with `useAuth` (`hooks/useAuth.ts`) and the Zustand `auth` store to re-route unauthenticated users to `auth/login` and incomplete profiles to onboarding.
- `state/auth.store.ts` preloads photos, exposes an immediate-clear `logout()` (in-memory reset + AsyncStorage token removal), and relies on `lib/supabase.ts` for AsyncStorage-backed session persistence.
- OTP login (`app/auth/login.tsx`) calls `sendOTP`/`verifyOTP`; onboarding (`app/auth/onboarding.tsx`) requests location, upserts the profile, and updates the store before routing into tabs.

### Location, Maps & Places
- `app/(tabs)/index.tsx` switches map/list view (web defaults to list) and reads data from `useCurrentLocation` / `useNearbyPlaces` in `hooks/useMap.ts`.
- `state/map.store.ts` holds current location, filters, nearby places, and selected place; `lib/geo.ts` handles distance & obfuscation, `lib/maps.ts` derives map regions, and `lib/places.ts` contains the 45-item Seoul dataset plus filter/translation helpers.
- Native vs. web map rendering is split via `components/NativeMap.native.tsx` (real `react-native-maps`) and `.web.tsx` (placeholder warning).

### Community & Chat Interplay
- `hooks/useCommunity.ts` blends session, map location, and Supabase queries to populate cards, filtering out blocked IDs and attaching distance metadata via `calculateDistance`.
- `hooks/useChat.ts` manages thread hydration, message histories, Supabase realtime subscriptions (`supabase.channel`), and proposal interactions. `state/chat.store.ts` caches threads/messages/proposals and tracks channel lifetimes.
- `app/chat/thread/[id].tsx` merges proposal slots and messages chronologically, rendering bubbles (`components/ChatBubble.tsx`) and proposal cards (`components/ProposalCard.tsx`); proposals originate from `app/place/[id].tsx` via `createProposal`, `respondToProposal`, and `cancelProposal`.

### Profile & Safety Flows
- Settings (`app/(tabs)/settings.tsx`) shows profile data, navigates to edit/photos/blocked screens, and wraps `logout()` in a timeout-protected `Promise.race` before forcing `router.replace('/auth/login')`.
- Profile editing (`app/profile/edit.tsx`) and photo management (`app/profile/photos.tsx`) sync with Supabase and the store; uploads use `lib/storage.ts` to compress and push to the `profile-photos` bucket (soft cap of six images). Blocked users (`app/settings/blocked-users.tsx`) fetch and unblock entries directly.
- `LOGOUT_FIX_REPORT.md` documents the regression fix ensuring logout always returns to the login route even if Supabase sign-out lags.

### Database & Policy Notes
- `supabase/migrations/20251008142138_create_initial_schema_fixed.sql` defines tables for profiles, photos, blocks, reports, threads, members, messages, and slots, each with tailored RLS policies (thread membership checks dominate messaging/proposal access).
- Trigger `update_thread_timestamp` keeps `threads.updated_at` current on new messages; supporting indexes optimize frequent lookups (memberships, message ordering, slots).

### Reference Material & Tooling
- `README.md`, `PROJECT_SUMMARY.md`, and `GEMINI.md` provide setup instructions, feature breakdowns, and collaboration conventions (strict TypeScript, Zustand for shared state, hooks as data-access layer, Expo Router navigation).
- TypeScript strict mode (`tsconfig.json`) and Expo SDK 54 config (`package.json`) underpin ~3.8k lines of TS/TSX code across screens, hooks, stores, and utilities.

---
_Document maintained to preserve high-level project context for agents without reloading full repository._ 
