# Debug Log Follow-up Notes

This document captures the investigation state after reviewing `debug_log.rtf` and the associated map screen changes.

## What Was Reviewed
- `debug_log.rtf` for the previous Codex session history and unfinished tasks
- `app/(tabs)/index.tsx` (map screen)
- Related helpers and stores: `services/places.google.ts`, `state/map.store.ts`, `lib/geo.ts`, `hooks/useMap.ts`
- Project overview docs (`README.md`, `PROJECT_SUMMARY.md`, `AGENTS.md`)

## Key Observations
- Map screen now clamps regions to Korean bounds and limits fetch radius to 10 km.
- Google Places fetches are filtered client-side to stay within the radius.
- Fallback mock places use the same distance filter.
- Region control became partially controlled; `region` state is set but `MapView` only gets `initialRegion` to avoid jitter.
- `setSelectedGooglePlace` now syncs from a local `selectedPlaceId` effect; direct store writes in event handlers were reduced.
- Callout rendering was refactored into a helper to avoid stray text nodes causing React Native errors.

## Outstanding Issues from the Log
1. Repeated "Text strings must be rendered within a <Text> component" errors likely stemmed from whitespace in `Callout` children—refactor addressed this but needs verification.
2. Warning about updating store state during render originated from `setSelectedGooglePlace` usage; the new effect-based sync should resolve it, but needs testing.
3. Map jitter/react-centering concerns: ensure `constrainRegion` and `animateToRegion` calls no longer fight user panning.

## Next Steps
- Run the app (iOS/Android) to confirm map panning stays within bounds without jitter.
- Verify markers display without RN text errors on both native and web targets.
- Check that selecting a place (map/list) still navigates to `/place/[id]` with the appropriate store state populated.
