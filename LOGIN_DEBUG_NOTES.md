# Login Stability & Instrumentation Notes

_Last updated: 2025-10-14_

This document summarizes the recent debugging and hardening work around the OTP login/onboarding flow. Share this with any engineer investigating authentication so they can ramp up immediately.

---

## 1. Symptom Recap

- Users occasionally looped between login and onboarding even with valid sessions.
- Cold app launches sometimes flashed the onboarding screen before landing on tabs.
- Need arose for an in-app Supabase connectivity diagnostic.

## 2. Root Causes Identified

1. **Race between session init and profile hydration**
   - `auth.initialize()` fetched the Supabase session, kicked off `fetchProfile()`, **and enforced a 5s safety timeout** that set `loading=false` even if the profile request hadn’t returned.
   - `Gate` saw `session != null` and `profile == null` → immediately redirected to onboarding.
   - Result: onboarding flash or full misrouting when the profile query was just slow.

2. **Concurrent profile fetches**
   - Multiple hooks triggered `fetchProfile()` in parallel (e.g., `onAuthStateChange`, auto hydrate, retries), hammering Supabase for the same user if the first promise ran slowly.

3. **Lack of in-app logging/diagnostics**
   - Hard to confirm whether Supabase REST endpoints were reachable from the device.

## 3. Key Mitigations Implemented

### 3.1 Supabase Debug Screen
- Path: `app/debug/supabase.tsx`
- Reachable via Settings or directly from login screen (`Supabase 디버그 화면 열기`).
- Performs a direct `fetch` to `/rest/v1/profiles?select=id&limit=1` with the anon key.
- Logs status, headers, body, and exposes a **Copy logs** button for sharing output.
- Uses Expo Haptics for quick success/error feedback.

### 3.2 Settings Shortcut
- `app/(tabs)/settings.tsx` includes **“Supabase 디버그 실행”** button to open the debug screen.

### 3.3 Login Screen Cleanup
- `app/auth/login.tsx` logs OTP lifecycle events and hydrates profiles immediately after verification to avoid gate thrash.
- Provides direct link to debug screen.

### 3.4 Auth Store Hardening (`state/auth.store.ts`)
- Added `profilePending` state to signal in-flight hydration.
- Removed the 5s timeout; `initialize()` keeps `loading=true` until profile fetch resolves.
- `fetchProfile` now deduplicates concurrent requests using an in-memory promise map.
- On fallback, the store flags `profileError` but keeps `profile=null` so Gate can handle onboarding legitimately.
- Logout resets all auth state deterministically.

### 3.5 Hook Adjustments (`hooks/useAuth.ts`)
- `useAuth` now surfaces `profilePending`.
- Auto hydration/retry skip kicks if a fetch is already pending.
- `onAuthStateChange` clears profile and pending flags on sign-out events.

### 3.6 Gate (Root Router) Logic (`app/index.tsx`)
- Waits on splash when `profilePending` or when profile fetch hasn’t completed.
- Only redirects to onboarding when `profileChecked === true` AND `profile == null`.
- Prevents onboarding flashes on slow network conditions.

## 4. Expected Flow (OTP Login)
1. User opens app → Gate stays on splash while auth initializes.
2. `initialize()` fetches session and profile; `loading` stays `true` until profile arrives.
3. If profile exists, Gate routes to `/(tabs)`.
4. If profile missing and fetch completes, Gate routes to onboarding (legitimate new user).
5. Debug screen can be used at any point to verify Supabase REST accessibility.

## 5. Instrumentation Tags
Watch for the following log prefixes:

- `[AUTH:init]` — session bootstrap lifecycle.
- `[AUTH:fetchProfile]` — profile hydration attempts (with durations and fallbacks).
- `[AUTH:onAuthStateChange]` — Supabase auth event stream.
- `[AUTH:autoFetchProfile]` / `[AUTH:retryFetchProfile]` — store-level hydration triggers.
- `[LOGIN]` — OTP request/verify flow and pre-hydration behavior.
- `[GATE]` — final routing decisions.

## 6. Residual Risks / Next Steps
- If Supabase returns a 200 with an empty profile array (`[]`), onboarding is the correct destination; ensure the user actually completes onboarding to create the row.
- Consider persisting a lightweight “profile presence” flag if onboarding state needs to survive offline.
- Add telemetry counters for `[AUTH:init]` duration and `fetchProfile` fallbacks to monitor real-world performance.

## 7. Quick Verification Checklist
1. Launch app cold → observe Gate staying on splash until profile is ready.
2. OTP login → confirm `[LOGIN] profile hydrated -> replace /(tabs)`.
3. Tap Settings → “Supabase 디버그 실행” → run fetch test → copy/share logs.
4. Sign out → ensure state resets and login screen appears.

With the above changes, the login/onboarding UX should be resilient against slow Supabase responses and provide clear diagnostics when backend issues occur.
