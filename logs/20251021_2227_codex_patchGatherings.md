# [20251021_2227] Gatherings Trigger Rejoin Fix

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Ensure `gatherings.current_count` stays accurate when participants rejoin.
- Document verification of earlier join/leave/store fixes and roadmap updates.

## Files Modified
- supabase/migrations/20251021_0700_create_gatherings.sql

## Summary of Edits
- Added trigger handling for `left → joined` updates so rejoining bumps `current_count`.
- Reconfirmed hooks/store logic rely on trigger-managed counts and do not double seed.

## Key Diff (condensed)
```diff
   IF TG_OP = 'INSERT' AND NEW.status = 'joined' THEN
     UPDATE gatherings
     SET current_count = current_count + 1
     WHERE id = NEW.gathering_id;
+  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'left' AND NEW.status = 'joined' THEN
+    UPDATE gatherings
+    SET current_count = current_count + 1
+    WHERE id = NEW.gathering_id;
   ELSIF TG_OP = 'UPDATE' AND OLD.status = 'joined' AND NEW.status = 'left' THEN
     UPDATE gatherings
     SET current_count = current_count - 1
```

## Notes
- `npm run typecheck` could not run in the sandbox (permission failure); rerun locally if needed.
- Phase 1 remains flagged as blocked in the roadmap until this patch is merged.
