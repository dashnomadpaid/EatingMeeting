# [2025-10-13 15:55] Stabilize Map Store Setter

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Stop the map tab from crashing when returning from other tabs by preventing redundant Zustand updates.

## Files Modified
- state/map.store.ts

## Summary of Edits
- Updated `setSelectedGooglePlace` to return an empty patch when the incoming place matches the stored one instead of re-publishing the full state.
- Ensured `null` to `null` transitions no longer emit a change event.

## Key Diff (condensed)
```diff
-      if (prev && place && prev.id === place.id) {
-        return state;
-      }
-      if (!prev && !place) {
-        return state;
-      }
-      return { ...state, selectedGooglePlace: place };
+      if (prev?.id === place?.id) {
+        return {};
+      }
+      if (!prev && !place) {
+        return {};
+      }
+      return { selectedGooglePlace: place };
```

## Notes
- Revisit the flow of tapping a place → community tab → map tab to confirm the maximum update depth error no longer appears.
