# [2025-10-13 23:19] Clarify Logging Workflow in AGENTS.md

**Agent:** Codex  
**Branch:** main  
**Commit:** pending commit  

## Purpose
- Update `AGENTS.md` so every session knows to log *after* completing work, including attempts, errors, and final diffs.

## Files Modified
- AGENTS.md

## Summary of Edits
- Replace the generic reminder with explicit instructions: read the logging playbook first, perform work, then document detailed logs only after changes are done.

## Key Diff (condensed)
```diff
-> ⚠️ Every new agent session must read `PLAYBOOK/AI_LOGGING_PLAYBOOK.md` before making any changes.
-> This ensures logging and workflow rules are followed from the start.
++> ⚠️ Before touching code, read `PLAYBOOK/AI_LOGGING_PLAYBOOK.md`.
++> ✅ After completing your work, write a `/logs/YYYYMMDD_HHmm_agent_topic.md` entry detailing attempts, errors, and final diffs.
```

## Notes
- Supersedes previous reminder entry.
