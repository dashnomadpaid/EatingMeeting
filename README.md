# EatingMeeting (이팅미팅)

A React Native + Expo app that helps people find meal buddies without presenting itself as a dating app. Connect over shared meals, discover new restaurants, and make friends through food.

## Features

- **Map Discovery**: Browse nearby restaurants on an interactive map with distance filtering
  - ✅ **Google Places API (New)** powers the primary dataset
  - Fetches up to 200 restaurants/cafes within a 10km radius with real photos, ratings, and addresses
  - Falls back to a curated 45-item Seoul list if the API request fails (e.g. missing key or CORS on web)
- **Community**: Find prospective meal buddies using distance- and preference-based filters
  - ⚠️ Default experience shows 8 curated mock profiles; toggle `USE_MOCK_DATA` to query Supabase
- **Realtime Chat**: One-to-one direct messages with live updates (text only)
- **Meal Proposal Entry Point**: Place detail CTA routes to chat selection, preparing groundwork for proposal workflows
- **Profile Management**: Upload and manage photos directly from the device gallery
- **Safety Surfaces**: View and clear your blocked-user list, with locations displayed as approximate distances only
- **Privacy-Focused**: Location data is obfuscated to ~1km precision; no background tracking

## Tech Stack

- **Frontend**: Expo + React Native + TypeScript
- **Navigation**: Expo Router (file-based)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Maps**: react-native-maps
- **Date/Time**: date-fns
- **Icons**: Lucide React Native

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator, or Expo Go app on physical device
- Supabase account (already configured)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**  
   The `.env` file is already configured with Supabase credentials:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key  # Required for live restaurant discovery
   ```

   > **Note**: Without `GOOGLE_PLACES_API_KEY`, the Discover tab falls back to 45 mock Seoul restaurants.

3. **Database Setup**
   The database schema has been applied with the following tables:
   - `profiles` - User profiles with approximate location
   - `photos` - Profile photos
   - `threads` - Chat conversations
   - `members` - Thread participants
   - `messages` - Chat messages
   - `slots` - Meal proposals
   - `blocks` - User blocking relationships
   - `reports` - User reports for moderation

   > **Note:** after enabling Row Level Security on these tables, run the latest Supabase migration (`supabase/migrations/20250217154500_grant_table_access.sql`) so the `authenticated` role keeps `SELECT/INSERT/UPDATE` access. Without the grant PostgREST drops the tables from its schema cache (surfacing `PGRST205` during profile creation).

4. **Supabase Storage**:
   Create a storage bucket named `profile-photos` in your Supabase project with public access.

## Running the App

Start the development server:

```bash
npm run dev
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## Project Structure

```
app/
├── auth/           # Login and onboarding screens
├── (tabs)/         # Main tab navigation
│   ├── index.tsx   # Map/Discover tab
│   ├── community.tsx
│   ├── chat.tsx
│   └── settings.tsx
├── chat/           # Chat-related screens
├── place/          # Place detail screens
├── profile/        # Profile management
└── settings/       # Settings screens

components/         # Reusable UI components
hooks/             # Custom React hooks
lib/               # Core utilities and services
state/             # Zustand state stores
types/             # TypeScript type definitions
```

## Key Features Explained

### Restaurant Discovery (Google Places API Integration)

The Discover tab uses **Google Places API (New)** to fetch real restaurant and cafe data based on your current location. The app:
- Queries nearby places within a 10km radius using `searchNearby` endpoint
- Supports pagination to fetch up to 200 results per search
- Falls back to 45 mock Seoul restaurants if API fails or on web platform
- Displays real photos, ratings, and addresses from Google
- Filters results by distance, category, and search query

**Implementation**: `services/places.google.ts` handles API calls, `app/(tabs)/index.tsx` manages map and list views with real-time place selection.

### Community Tab (Mock or Live Profiles)

- The Community (밥친구) tab defaults to **mock personas** (8 seeded profiles) so the UI stays populated in development.
- Feature flag `USE_MOCK_DATA = true` lives in `hooks/useCommunity.ts`.
- Distance, budget, and dietary filters apply to both mock and real data.
- To pull live Supabase profiles, set `USE_MOCK_DATA = false` and ensure `profiles.approx_lat`/`approx_lng` fields are populated. While the flag is `true`, tapping a card surfaces a mock-mode alert instead of opening a DM.

### Meal Proposal CTA (In Progress)

- Place detail pages expose a “같이 식사 제안하기” button that currently routes to the chat thread picker.
- Proposal creation (`createProposal`) and status cards exist in the codebase but are not yet wired into the navigation flow—no date/time picker UI is presented.
- Planned next steps: let users compose a proposal (place + schedule + notes) before inserting into Supabase and emitting the corresponding system message.

### Privacy & Security

- User locations are obscured to ~1km accuracy (rounded to 0.01 degrees)
- Row Level Security (RLS) enforces data access control
- Block and report features for user safety
- Foreground location permission only (no background tracking)

### Real-time Features

- New direct messages appear instantly via Supabase Realtime
- Thread list refreshes automatically on new content
- Proposal status updates will re-use the same channel machinery once the creation UI is finalized

## Development Notes

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

### No PostGIS

The MVP uses simple numeric lat/lng columns with client-side distance calculations (haversine formula) instead of PostGIS for simplicity.

### Push Notifications & Moderation

- Push notifications are not yet registered in-app. `expo-notifications` is installed, but token capture/storage still needs implementation.
- Content moderation endpoints are not integrated; moderation will be addressed in a later phase.

## Copy Guidelines

The app maintains a "meal buddy" tone throughout:
- ✅ Use: "meal buddy", "find someone to eat with", "propose a meal", "dining companion"
- ❌ Avoid: "dating", "match", "romance", "relationship"

## Testing

Run type checking:
```bash
npm run typecheck
```

## Future Enhancements

- **Community Tab**: Default to live Supabase profiles once geo data is ready
- **Meal Proposals**: Full creation/respond flow (date/time picker, notes, channel updates)
- **Advanced Place Filters**: Cuisine type, opening hours, price level from Google
- Mapbox SDK for advanced mapping features
- Server-side push notifications via Edge Functions
- AI-assisted moderation pipeline
- Calendar integration for meal scheduling
- Group chat enhancements (member management, naming)
- Video calls for group planning
- Admin dashboard for moderation and analytics

## License

Private project for MVP demonstration.
