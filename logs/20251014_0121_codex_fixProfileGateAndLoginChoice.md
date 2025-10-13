# [2025-10-14 01:21] Fix missing-profile gating and login method choice

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Problem Summary
- Backend has no `profiles` row for the user (e.g., `sero55`). Settings still showed a name (`sero55`) with empty bio because a synthetic fallback profile was injected into the store using the email local-part.
- Logout printed timeout warnings (`Local signOut failed`, `Global signOut failed`) and navigated to OTP login. Re-login felt broken/confusing; users with password accounts wanted a clear path back to password login.

## Root Causes
1) Store-level fallback profile masked absence of a real `profiles` row, preventing routing to onboarding and confusing the Settings view.  
2) Gate logic sent users to Tabs when profile fetch errored or wasn’t checked, further masking onboarding.  
3) Login screens lacked a clear toggle between OTP and password methods.

## Changes
- Do not set a synthetic fallback profile in the store when `profiles` row is missing or fetch errors. Mark `profileChecked=true`, `profileError=true`, keep `profile=null`. (Settings shows placeholder; Gate can route to onboarding.)
- Revert `useAuth` to return the raw store `profile` (no synthetic fallback at hook-level).
- Simplify Gate: if `session && !profile`, route to onboarding.
- Add cross-links between OTP and password login screens for clarity.

## Files Modified
- state/auth.store.ts
- hooks/useAuth.ts
- app/index.tsx
- app/auth/login.tsx
- app/auth/login-password.tsx

## Key Diff (condensed)
```diff
--- a/state/auth.store.ts
+++ b/state/auth.store.ts
@@
-  const fallback = () => {
-      const synthetic = buildFallbackProfile(userId, currentSession);
-      set({ profile: synthetic, profileChecked: true, profileError: true });
-      return synthetic;
-    };
+  const fallback = () => {
+      set({ profile: null, profileChecked: true, profileError: true });
+      return null;
+    };
```

```diff
--- a/hooks/useAuth.ts
+++ b/hooks/useAuth.ts
@@
-import { buildFallbackProfile, useAuthStore } from '@/state/auth.store';
+import { useAuthStore } from '@/state/auth.store';
@@
-  const hydratedProfile =
-    profile ?? (session?.user ? buildFallbackProfile(session.user.id, session) : null);
-
-  return { session, profile: hydratedProfile, loading, logout, profileChecked, profileError };
+  return { session, profile, loading, logout, profileChecked, profileError };
```

```diff
--- a/app/index.tsx
+++ b/app/index.tsx
@@
-  if (session && !profile) {
-    if (!profileChecked || profileError) {
-      return <Redirect href="/(tabs)" />;
-    }
-    return <Redirect href="/auth/onboarding" />;
-  }
+  if (session && !profile) {
+    return <Redirect href="/auth/onboarding" />;
+  }
```

```diff
--- a/app/auth/login.tsx
+++ b/app/auth/login.tsx
@@
+          <View style={{ height: 12 }} />
+          <Text
+            style={[styles.link, { textAlign: 'center' }]}
+            onPress={() => router.push('/auth/login-password')}
+          >
+            비밀번호로 로그인
+          </Text>
@@
-  resend: TextStyle;
+  resend: TextStyle;
+  link: TextStyle;
@@
   resend: {
@@
   },
+  link: { color: '#007aff', fontSize: 14, fontWeight: '500' },
```

```diff
--- a/app/auth/login-password.tsx
+++ b/app/auth/login-password.tsx
@@
-          <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.push('/auth/signup')}>
-            처음이신가요? 이메일 인증으로 회원가입
-          </Text>
+          <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.push('/auth/login')}>
+            이메일 인증(OTP)으로 로그인
+          </Text>
+          <View style={{ height: 8 }} />
+          <Text style={[styles.link, { textAlign: 'center' }]} onPress={() => router.push('/auth/signup')}>
+            처음이신가요? 이메일 인증으로 회원가입
+          </Text>
```

## Outcome
- If a user’s profile row doesn’t exist, the gate now sends them to onboarding instead of masking with a synthetic profile.
- Settings no longer shows a fake `display_name` derived from email.
- Users can easily switch between OTP and password login methods.

## Notes
- Sign-out warnings reflect network timeouts for global revocation; local logout is still effective because state and tokens are cleared immediately.
- If stricter sign-out guarantees are needed, we can add a background retry policy or exponential backoff for `global` scope.
