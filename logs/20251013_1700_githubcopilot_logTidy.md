# [2025-10-13 17:00] Polish Console Logs

**Agent:** GitHub Copilot  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Reformat high-volume CLI logs so they stay readable while preserving essential debugging data.

## Files Modified
- app/index.tsx
- state/auth.store.ts
- state/map.store.ts
- app/(tabs)/index.tsx

## Summary of Edits
- Gate logs now use emojis and abbreviated IDs to highlight loading vs authenticated states in one glance.
- Auth initialization messages were normalized with short session IDs and clear status icons.
- Map selection logging was collapsed to single-line updates (change / unchanged) using short IDs and action symbols.
- Debug-only selection pruning messages in the map screen now reuse the short-ID helper and concise phrasing; defaulted `DEBUG_PLACE_SYNC` to `false`.

## Key Diff (condensed)
```diff
-    console.log('[GATE] loading=yes session=none profile=none')
+    console.log(`GATE ${icon} load=${loading ? 'on' : 'off'} session=${shortSession} profile=${shortProfile}`)
@@
-      console.log(`[MAP] selection update ${prevLabel} -> ${nextLabel}`);
+      console.log(`[MAP] → selection ${prevLabel} → ${nextLabel}`);
```

## Notes
- Flip `DEBUG_PLACE_SYNC` back to `true` when deeper map selection tracing is needed.
```