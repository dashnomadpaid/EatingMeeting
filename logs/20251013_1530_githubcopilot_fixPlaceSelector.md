# [2025-10-13 15:30] Prevent Place Detail Store Loop

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Stop the place detail screen from re-rendering indefinitely due to an uncached Zustand snapshot selector.

## Files Modified
- app/place/[id].tsx

## Summary of Edits
- Switched the map store selector to read individual fields to keep snapshots stable.
- Prevented Expo Router from triggering repeated updates caused by repeated store reads.

## Key Diff (condensed)
```diff
-  const { selectedPlace, selectedGooglePlace } = useMapStore((state) => ({
-    selectedPlace: state.selectedPlace,
-    selectedGooglePlace: state.selectedGooglePlace,
-  }));
+  const selectedPlace = useMapStore((state) => state.selectedPlace);
+  const selectedGooglePlace = useMapStore((state) => state.selectedGooglePlace);
```

## Notes
- Re-test the place detail screen to confirm the logs no longer report `getSnapshot` infinite loop warnings.
