# [2025-10-14 01:10] Fix logout → re-login flow (OTP vs password)

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- After pressing logout, local/global sign-out timed out (expected under poor network), the UI navigated to `/auth/login-password`, and re-login failed for OTP-only users (no password). We align post-logout navigation and the gate redirect to the OTP login screen.

## Observed Symptoms
- CLI logs: `WARN Local signOut failed [Error: signOut timeout]`, `WARN Global signOut failed [Error: signOut timeout]` right after confirming logout.
- UI returned to login page, but password-based login failed with an alert; actual logout felt uncertain.

## Root Cause
- The sign-out warnings came from the defensive timeouts in `state/auth.store.ts::logout()` — network latency can cause `supabase.auth.signOut` to exceed the timeout. Despite warnings, we already clear in-memory state and purge AsyncStorage tokens, so local logout is effective.
- The re-login failure occurred because Settings routed to the password login screen (`/auth/login-password`). OTP-only accounts don’t have a password, so they hit a “로그인 실패” alert. Also, the app gate (`app/index.tsx`) redirected unauthenticated users to the password screen as well.

## Changes Made
- Route to the OTP login screen by default:
  - `app/(tabs)/settings.tsx`: replace post-logout route to `/auth/login`.
  - `app/index.tsx`: change unauthenticated gate redirect to `/auth/login`.

## Files Modified
- app/(tabs)/settings.tsx
- app/index.tsx

## Key Diff (condensed)
```diff
--- a/app/(tabs)/settings.tsx
+++ b/app/(tabs)/settings.tsx
@@
-    router.replace('/auth/login-password');
+    // Route to OTP login by default. Password accounts can switch from there.
+    router.replace('/auth/login');
```

```diff
--- a/app/index.tsx
+++ b/app/index.tsx
@@
-  if (!session) {
-    return <Redirect href="/auth/login-password" />;
-  }
+  if (!session) {
+    // Default to OTP login; password users can navigate to password screen.
+    return <Redirect href="/auth/login" />;
+  }
```

## Notes
- The sign-out warnings are harmless from a local state perspective: we already clear in-memory auth and tokens even if `global` revocation times out. Server-side refresh token revocation may complete later. If we need stricter guarantees, we can retry global revocation in the background.
- Users who rely on password login can still navigate to `/auth/login-password` from the OTP screen.
