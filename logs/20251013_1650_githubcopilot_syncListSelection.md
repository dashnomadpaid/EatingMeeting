# [2025-10-13 16:50] Sync List Selection With Map Region

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- When a user selects a place from the list view, make sure the corresponding marker becomes the active one on the map instead of leaving the previously tapped marker highlighted.

## Files Modified
- app/(tabs)/index.tsx

## Summary of Edits
- Compute a constrained region centered on the tapped list item, update the controlled `region` state, and animate the map to match.
- Move the `setSelectedGooglePlace` call after the region sync so marker highlights align with the newly focused place.

## Key Diff (condensed)
```diff
-                  setSelectedGooglePlace(item);
-                  if (mapRef.current && 'animateToRegion' in mapRef.current && region) {
-                    const nextDelta = Math.min(
-                      region.latitudeDelta,
-                      CLUSTER_DELTA_THRESHOLD * 0.9,
-                    );
-                    mapRef.current.animateToRegion(
-                      {
-                        latitude: item.lat,
-                        longitude: item.lng,
-                        latitudeDelta: nextDelta,
-                        longitudeDelta: nextDelta,
-                      },
-                      350,
-                    );
-                  }
+                  const currentDelta = region
+                    ? Math.min(region.latitudeDelta, CLUSTER_DELTA_THRESHOLD * 0.9)
+                    : DEFAULT_DELTA;
+                  const nextRegion = constrainRegion({
+                    latitude: item.lat,
+                    longitude: item.lng,
+                    latitudeDelta: currentDelta,
+                    longitudeDelta: currentDelta,
+                  });
+                  setRegion(nextRegion);
+                  if (mapRef.current && 'animateToRegion' in mapRef.current) {
+                    mapRef.current.animateToRegion(nextRegion, 350);
+                  }
+                  setSelectedGooglePlace(item);
```

## Notes
- Re-test the flow: list → select place → map should center on the new marker and highlight it in orange.
