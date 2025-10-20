# [2025-10-20 21:32] Clarify Log Timestamp Guidance

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Ensure agents use live timestamp tokens so log filenames and headers reflect the actual completion time.

## Files Modified
- AGENTS.md

## Summary of Edits
- Added a reminder beneath the logging instructions to generate timestamps with runtime commands or placeholders.

## Key Diff (condensed)
```diff
-> ✅ After completing your work, write a `/logs/YYYYMMDD_HHmm_agent_topic.md` entry detailing what you tried, any errors hit, and the final diffs.
+> ✅ After completing your work, write a `/logs/YYYYMMDD_HHmm_agent_topic.md` entry detailing what you tried, any errors hit, and the final diffs.
+> 💡 Generate the timestamp portion and the header's time stamp using a live time token (for example `$(date +%Y%m%d_%H%M)` or `<now>`) so both reflect the actual completion moment.
```

## Notes
- No tests required.
