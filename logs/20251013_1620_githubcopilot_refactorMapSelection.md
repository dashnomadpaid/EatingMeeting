# [2025-10-13 16:20] Refactor Map Selection State

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Break the feedback loop between the map screen and the map store that caused maximum update depth errors when navigating between tabs.

## Files Modified
- app/(tabs)/index.tsx
- state/map.store.ts

## Summary of Edits
- Removed the local `selectedPlaceId` state and now rely solely on the Zustand store for Google place selection.
- Added a ref-backed guard so `loadPlaces` can verify whether the current selection still exists before clearing it.
- Updated marker/list handlers to write directly to the store and highlight based on store state.
- Ensured the store setter returns the existing state when the incoming place is unchanged, preventing redundant notifications.

## Key Diff (condensed)
```diff
-  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
+  const selectedGooglePlaceRef = useRef<GooglePlace | null>(storeSelectedGooglePlace);
@@
-        setPlaces(withinRadius);
-        setPlacesError(null);
-        setSelectedPlaceId((prev) => {
-          if (prev) {
-            const existing = withinRadius.find((place) => place.id === prev);
-            if (existing) {
-              return prev;
-            }
-          }
-          return null;
-        });
+        setPlaces(withinRadius);
+        setPlacesError(null);
+        const currentSelected = selectedGooglePlaceRef.current;
+        if (currentSelected && !withinRadius.some((p) => p.id === currentSelected.id)) {
+          setSelectedGooglePlace(null);
+        }
@@
-      setSelectedPlaceId(place.id);
       setSelectedGooglePlace(place);
@@
-  setSelectedGooglePlace: (place) =>
-    set((state) => {
-      const prev = state.selectedGooglePlace;
-      if (prev?.id === place?.id) {
-        return {};
-      }
-      if (!prev && !place) {
-        return {};
-      }
+  setSelectedGooglePlace: (place) =>
+    set((state) => {
+      const prev = state.selectedGooglePlace;
+      if (prev?.id === place?.id) {
+        return state;
+      }
+      if (!prev && !place) {
+        return state;
+      }
       return { selectedGooglePlace: place };
     }),
```

## Notes
- `[MapDebug]` logs remain active; once the issue is confirmed resolved we can disable them.
- Please rerun the crash reproduction flow and share the new logs so we can verify the loop is gone.
