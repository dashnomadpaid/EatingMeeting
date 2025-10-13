# 🤖 AI_LOGGING_PLAYBOOK.md

**Purpose:**  
This playbook defines how AI agents (e.g., Codex, Gemini, Cursor, etc.) must log every code modification into individual files under the `/logs/` directory for auditability, rollback safety, and documentation.

---

## 🧩 Workflow Overview

Whenever the agent modifies any file in the repository, it must **automatically create a new Markdown log file** inside `/logs/`.  
Each log captures the purpose, files changed, key diffs, and commit metadata.

---

## 📁 Log File Rules

### Naming Convention
```
/logs/<YYYYMMDD_HHmm>_<agentName>_<shortTopic>.md
```
**Examples:**
- `/logs/20251013_2130_codex_fixSpinnerBug.md`
- `/logs/20251013_2135_gpt5_updateMapMarkers.md`

### Log File Template
```markdown
# [<Timestamp>] <Short Title>

**Agent:** Codex (or Gemini, etc.)  
**Branch:** <git branch>  
**Commit:** <SHA or “pending commit”>  

## Purpose
- Explain why the change was needed (bug fix, optimization, feature addition, etc.)

## Files Modified
- List all affected files (with paths)

## Summary of Edits
- Summarize the change in concise bullet points

## Key Diff (condensed)
```diff
- old code line or behavior
+ new code line or behavior
```

## Notes
- Optional remarks, test results, or known side effects
```

---

## ⚙️ Commit & Push Workflow

After creating the log file and applying code edits, the agent should run:
```bash
git add -A
git commit -m "<type>: <summary>"
git push -u origin HEAD
```

**Commit types:**
- `feat`: New feature  
- `fix`: Bug fix  
- `refactor`: Code restructuring  
- `chore`: Maintenance or setup  
- `docs`: Documentation changes  
- `test`: Test-related updates

---

## 🔒 Safety & Compliance

- Never log secrets or API keys. Mask sensitive info as `****`.
- Never alter `.gitignore`, `.env`, or other protected files.
- If `/logs/` is read-only, print the full log block in Markdown so the user can create it manually.

---

## ✅ Session Summary Requirement

At the end of each session:
- Print number of logs created
- List all generated filenames
- Include commit SHAs and modified file paths

---

## 🚀 Starter Command Example

Paste this at the start of any agent session:

```
You are Codex working in my local repo.
Every time you edit code, create a separate Markdown log inside /logs/.
Use the format YYYYMMDD_HHmm_agent_topic.md.
After each patch, run git add -A && git commit -m "<type>: <summary>" && git push.
Confirm the log filename created.
```

---

*Maintained for the EatingMeeting project.*
