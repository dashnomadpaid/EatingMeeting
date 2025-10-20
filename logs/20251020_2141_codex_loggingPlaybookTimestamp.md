# [2025-10-20 21:41] Align Logging Playbook Timestamp Guidance

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Clarify that log filenames and headers must use real-time timestamp tokens so audit records capture actual completion times.

## Files Modified
- PLAYBOOK/AI_LOGGING_PLAYBOOK.md

## Summary of Edits
- Added reminders in the naming convention and template sections to generate timestamps via live commands or placeholders.

## Key Diff (condensed)
```diff
 /logs/<YYYYMMDD_HHmm>_<agentName>_<shortTopic>.md
-```
-**Examples:**
+```
+Use a live timestamp token (e.g. `$(date +%Y%m%d_%H%M)` or `<now>`) when generating the filename so the recorded time matches when the work completes.
+**Examples:**
 ...
 ## Notes
 - Optional remarks, test results, or known side effects
 ```
+When filling `<Timestamp>` in the header, use the same live timestamp token you used for the filename so the entry reflects the exact completion time.
```

## Notes
- No code changes to test.
