# [2025-10-13 16:40] Streamline CLI Logs

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Make frequently printed CLI logs easier to scan while preserving essential debugging details for gate, auth, and map flows.

## Files Modified
- app/index.tsx
- state/auth.store.ts
- state/map.store.ts
- app/(tabs)/index.tsx

## Summary of Edits
- Reformatted the gate status log into a single concise line showing loading, session, and profile state.
- Normalized auth initialization messages to a consistent `[AUTH]` prefix with clear stage descriptors.
- Replaced verbose `MapDebug` payload logs with focused `[MAP]` strings that still report previous/next IDs and list counts.
- Added a helper to format map selection IDs and ensured unchanged/empty-state paths emit readable messages.

## Key Diff (condensed)
```diff
-    console.log('[GATE] state', {
-      loading,
-      session: session?.user?.id ?? null,
-      profile: (profile as any)?.id ?? null,
-    });
+    console.log(
+      `[GATE] loading=${loading ? 'yes' : 'no'} session=${sessionId ?? 'none'} profile=${profileId ?? 'none'}`,
+    );
@@
-      console.log('[AUTH:init] session=', session?.user?.id ?? null);
+      console.log(`[AUTH] init session=${session?.user?.id ?? 'none'}`);
@@
-      console.log('[MapDebug] setSelectedGooglePlace called', {
-        prev: prev?.id ?? null,
-        next: place?.id ?? null,
-      });
+      console.log(
+        `[MAP] selection call prev=${formatPlaceId(prev?.id)} next=${formatPlaceId(place?.id)}`,
+      );
```

## Notes
- Debug verbosity remains gated by `DEBUG_PLACE_SYNC`; toggle to `false` in `app/(tabs)/index.tsx` when no longer needed.
