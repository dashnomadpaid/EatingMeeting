# [2025-10-13 15:45] Limit Place Fetches & Add Diagnostics

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Ensure Places API calls only fire around the user’s current location instead of every map pan.
- Provide clear terminal diagnostics whenever the Places API is called so loading banners can be cross-checked.

## Files Modified
- app/(tabs)/index.tsx

## Summary of Edits
- Removed the debounced fetch tied to map region changes so panning no longer triggers new searches.
- Added a per-request counter with start/success/error/finish logs for every Places API call.
- Swapped to a single ref-based counter and trimmed unused debounce cleanup.

## Key Diff (condensed)
```diff
-  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
+  const fetchCounterRef = useRef(0);
@@
-    const controller = new AbortController();
-    abortRef.current = controller;
-    setFetching(true);
+    const controller = new AbortController();
+    abortRef.current = controller;
+    setFetching(true);
+
+    const requestId = fetchCounterRef.current + 1;
+    fetchCounterRef.current = requestId;
+    console.log(
+      `[Places][${requestId}] ▶ start`,
+      `lat=${regionForSearch.latitude.toFixed(4)}`,
+      `lng=${regionForSearch.longitude.toFixed(4)}`,
+    );
@@
-      if (debounceRef.current) {
-        clearTimeout(debounceRef.current);
-      }
-      debounceRef.current = setTimeout(() => loadPlaces(constrained), 600);
+      if (
+        latDiff > 0.0008 ||
+        lngDiff > 0.0008 ||
+        latDeltaDiff > 0.002 ||
+        lngDeltaDiff > 0.002
+      ) {
+        if (mapRef.current && 'animateToRegion' in mapRef.current) {
+          mapRef.current.animateToRegion(constrained, 160);
+        }
+      }
```

## Notes
- Banner should now only appear when the location-driven fetch runs; console will show `[Places][n]` logs for each request.
