# [2025-10-13 16:30] Guard Selection During Empty Results

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Prevent the map selection from being cleared while place results are temporarily empty (e.g., during remounts or fetch transitions), which was triggering redundant fetches and crashes.

## Files Modified
- app/(tabs)/index.tsx

## Summary of Edits
- Only clear the stored selection when the refreshed result set is non-empty and no longer contains the selected place.
- Skipped the cleanup effect when `places.length === 0` to avoid unmount/remount transitions from nuking the selection.

## Key Diff (condensed)
```diff
-        if (currentSelected) {
-          const stillExists = withinRadius.some((place) => place.id === currentSelected.id);
-          if (!stillExists) {
+        if (currentSelected) {
+          const stillExists = withinRadius.some((place) => place.id === currentSelected.id);
+          if (!stillExists && withinRadius.length > 0) {
             setSelectedGooglePlace(null);
           }
         }
@@
-    if (!storeSelectedGooglePlace) return;
+    if (!storeSelectedGooglePlace || places.length === 0) return;
```

## Notes
- Please rerun the map → community → map flow; `[MapDebug]` logs should now show the selection persisting across the temporary empty state without looping.
