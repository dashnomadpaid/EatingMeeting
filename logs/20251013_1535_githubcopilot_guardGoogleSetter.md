# [2025-10-13 15:35] Guard Map Store Setter

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Prevent repeated Zustand updates from re-triggering the map screen effect and causing the maximum update depth error.

## Files Modified
- state/map.store.ts

## Summary of Edits
- Added guards inside `setSelectedGooglePlace` to exit early when the incoming place matches the one already stored.
- Ensured redundant `null` assignments no longer publish new state objects.

## Key Diff (condensed)
```diff
-  setSelectedGooglePlace: (place) => set({ selectedGooglePlace: place }),
+  setSelectedGooglePlace: (place) =>
+    set((state) => {
+      const prev = state.selectedGooglePlace;
+      if (prev && place && prev.id === place.id) {
+        return state;
+      }
+      if (!prev && !place) {
+        return state;
+      }
+      return { ...state, selectedGooglePlace: place };
+    }),
```

## Notes
- Re-run the navigation flow that previously hit the maximum update depth error to confirm the loop no longer occurs.
