# [2025-10-13 16:05] Insert Map Selection Debug Logs

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Capture the state transitions that may be causing the repeated map selection updates and crashes.

## Files Modified
- app/(tabs)/index.tsx
- state/map.store.ts

## Summary of Edits
- Added a `DEBUG_PLACE_SYNC` toggle and detailed logs in the map screen effect that syncs the selected Google place.
- Logged every call to `setSelectedGooglePlace`, including no-op guard paths, to trace redundant updates.

## Key Diff (condensed)
```diff
+const DEBUG_PLACE_SYNC = true;
@@
+    if (DEBUG_PLACE_SYNC) {
+      console.log('[MapDebug] sync effect run', {
+        selectedPlaceId,
+        storeSelectedId: storeSelectedGooglePlace?.id,
+        placesCount: places.length,
+      });
+    }
@@
+      console.log('[MapDebug] setSelectedGooglePlace called', {
+        prev: prev?.id ?? null,
+        next: place?.id ?? null,
+      });
```

## Notes
- After reproducing the crash flow, capture all `[MapDebug]` log lines so we can pinpoint the feedback loop.
