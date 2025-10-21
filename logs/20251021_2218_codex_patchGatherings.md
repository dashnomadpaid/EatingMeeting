# [20251021_2218] Gatherings Patch Cycle

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Resolve critical gatherings foundation bugs: double counting, rejoin failures, stale realtime state.
- Re-align roadmap status to flag remaining blockers until the patch lands.

## Files Modified
- supabase/migrations/20251021_0700_create_gatherings.sql
- hooks/useGathering.ts
- state/gathering.store.ts
- ROADMAP.md

## Summary of Edits
- Reset `gatherings.current_count` default to 0 so triggers own all count mutations.
- Swapped gathering join/leave flows to use upserts, rejoining cleanly and cleaning up chat membership.
- Added participant UPDATE handling in the Zustand store to drop `left` users and refresh joined members.
- Marked Phase 1 in the roadmap as blocked until these fixes ship.

## Key Diff (condensed)
```diff
-  current_count INT DEFAULT 1 CHECK (current_count >= 0),
+  current_count INT DEFAULT 0 CHECK (current_count >= 0),

-    const { error: participantError } = await supabase
-      .from('gathering_participants')
-      .insert({
+    const { error: participantError } = await supabase
+      .from('gathering_participants')
+      .upsert({
         gathering_id: gatheringId,
         user_id: session.user.id,
-        status: 'joined',
-        is_host: false,
-      });
+        status: 'joined',
+        is_host: existing?.is_host ?? false,
+      }, { onConflict: 'gathering_id,user_id' });

-      await supabase.from('members').insert({
+      await supabase.from('members').upsert({
         thread_id: threadData.id,
         user_id: session.user.id,
-        role: 'member',
-      });
+        role: (existing?.is_host ?? false) ? 'admin' : 'member',
+      }, { onConflict: 'thread_id,user_id' });

-      .on(
-        'postgres_changes',
-        {
-          event: 'INSERT',
+      .on(
+        'postgres_changes',
+        {
+          event: 'INSERT',
           schema: 'public',
           table: 'gathering_participants',
           filter: `gathering_id=eq.${gatheringId}`,
-        },
-        (payload) => {
-          get().addParticipant(gatheringId, payload.new as GatheringParticipant);
+        },
+        (payload) => {
+          const participant = payload.new as GatheringParticipant;
+          if (participant.status === 'left') {
+            get().removeParticipant(gatheringId, participant.user_id);
+          } else {
+            get().upsertParticipant(gatheringId, participant);
+          }
         }
       )
+      .on(
+        'postgres_changes',
+        {
+          event: 'UPDATE',
+          schema: 'public',
+          table: 'gathering_participants',
+          filter: `gathering_id=eq.${gatheringId}`,
+        },
+        (payload) => {
+          const participant = payload.new as GatheringParticipant;
+          if (participant.status === 'left') {
+            get().removeParticipant(gatheringId, participant.user_id);
+          } else {
+            get().upsertParticipant(gatheringId, participant);
+          }
+        }
+      )
```

## Notes
- `npm run typecheck` could not be executed inside the sandbox (permission restriction). Please rerun locally if needed.
- No additional known blockers after this patch; migration still requires deployment to take effect on shared environments.
