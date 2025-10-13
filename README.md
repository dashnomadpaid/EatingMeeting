# EatingMeeting (이팅미팅)

A React Native + Expo app that helps people find meal buddies without presenting itself as a dating app. Connect over shared meals, discover new restaurants, and make friends through food.

## Features

- **Map Discovery**: Browse nearby restaurants on an interactive map with category and budget filters
- **Community**: Find meal buddies nearby with distance-based filtering
- **Real-time Chat**: DM and group chats (up to 4 members) with image support
- **Meal Proposals**: Propose meals at specific restaurants with date/time selection
- **Accept/Decline System**: Interactive proposal cards with status tracking
- **Profile Management**: Upload photos, set dietary preferences, budget range, and meal times
- **Safety Features**: Block users and report inappropriate content
- **Privacy-Focused**: Only shows approximate distances, never exact locations

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

2. **Environment Variables**:
   The `.env` file is already configured with Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Database Setup**:
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

### Mock Restaurant Data

The app includes 45 Seoul restaurants across various neighborhoods (Gangnam, Hongdae, Itaewon, Myeongdong). Data is client-side filtered for MVP simplicity.

### Meal Proposal Flow

1. Browse map or community to find restaurants and meal buddies
2. View restaurant details
3. Click "Propose Meal Here"
4. Select a chat thread
5. Pick date/time and add notes
6. Other members can Accept or Decline
7. Status updates appear as system messages with live notifications

### Privacy & Security

- User locations are obscured to ~1km accuracy (rounded to 0.01 degrees)
- Row Level Security (RLS) enforces data access control
- Block and report features for user safety
- Foreground location permission only (no background tracking)

### Real-time Features

- New messages appear instantly via Supabase Realtime
- Proposal status updates broadcast to all thread members
- Thread list updates when new messages arrive

## Development Notes

### No PostGIS

The MVP uses simple numeric lat/lng columns with client-side distance calculations (haversine formula) instead of PostGIS for simplicity.

### Push Notifications

Expo push tokens are registered and stored, but server-side notification triggers are not implemented in this MVP. Use in-app toasts/badges instead.

### Content Moderation

Placeholder functions exist in `lib/moderation.ts` for future integration with text/image moderation APIs (Perspective API, AWS Rekognition, etc.).

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

- Real places API integration (Google Places, Yelp)
- Mapbox SDK for advanced mapping
- Server-side push notifications via Edge Functions
- Advanced content moderation with AI
- Calendar integration for meal scheduling
- Group chat enhancements (member management, naming)
- Video calls for group planning
- Admin dashboard for moderation

## License

Private project for MVP demonstration.
