# Codex Session Playbook (Keep in repo root)

> Purpose: When you restart Codex, paste the **Session Starter** block below so Codex
> follows the same safe workflow every time (scoped edits, commit + push, no diff/heredoc tricks).

---

## 🔰 Session Starter — paste this to Codex at the beginning of each session

**You are operating in this workspace only. Follow all rules exactly.**

1) **Scope**
   - Modify files **only inside the current repository**.
   - Use your **internal `apply_patch`** mechanism for file edits.
   - **Do NOT** use: `git diff`, `patch`, `python`, `bash here-docs`, or temp files.

2) **Safety & Secrets**
   - Never print or commit secrets. Assume `.env` files and keys are sensitive.
   - Do not touch files ignored by `.gitignore` unless I explicitly ask.

3) **Branching**
   - If I say “new feature” or “fix”, create a branch:  
     `git checkout -b feat/<topic>` or `git checkout -b fix/<topic>`  
     Otherwise continue on the current branch.

4) **Edits & Tests**
   - Make minimal, atomic commits per task.
   - After edits: run (if available)  
     - `npm run typecheck` (TS only)  
     - `npm run lint` (if present)  
     - `npx expo start -c` is **for me** to run locally; do not try to start servers here.

5) **Commit & Push (always)**
   - Stage & commit with a clear message, then push:
     ```bash
     git add -A
     git commit -m "<type>: <short reason> (#optional-ticket)"
     git push -u origin HEAD
     ```
   - Commit types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`.

6) **Status Report**
   - At the end of each task, summarize:
     - Files changed (paths)
     - What changed and why
     - Any manual steps I must run locally
     - Next recommended step

7) **If workspace is read-only**
   - Print final **full file contents between markers** so I can copy-paste:
     ```
     ---8<--- filename.tsx
     <content>
     --->8---
     ```

**Acknowledge these rules and ask me what task to do.**

---

## ✅ Quick Commands (for me, not Codex)

- Check git remotes:
  ```bash
  git remote -v
  ```
- Set origin (once):
  ```bash
  git remote set-url origin git@github.com:<USER>/<REPO>.git
  ```
- Create feature branch:
  ```bash
  git checkout -b feat/<topic>
  ```
- After Codex edits (redundant safety):
  ```bash
  git status
  git push
  ```

---

## 🧯 Secret Hygiene (must-have)

- Verify ignore rules work:
  ```bash
  git status --ignored -uall
  git check-ignore -v .env .env.* .expo node_modules
  ```
- Scan repo for accidental keys:
  ```bash
  gitleaks detect --source . --no-banner
  ```
- If a secret already committed:
  1) **Revoke/regenerate** at the provider (Supabase/Google/etc.).  
  2) Remove from history (BFG or filter-repo), then force-push.

---

## 🧭 Commit Message Examples

- `feat: integrate Google Places dot markers on map`
- `fix: prevent OTP spinner hang on auth failure`
- `chore: add Codex session playbook & update .gitignore`

---

## 📌 Notes for This Project

- Expo/React Native app; prefer **managed workflow** commands in docs—Codex must not attempt to run simulators.
- When adding code patches, respect existing paths:
  - `app/**`, `components/**`, `hooks/**`, `state/**`, `lib/**`, `services/**`, `supabase/migrations/**`
- For schema changes: **print SQL** or place under `supabase/migrations/*.sql` and commit.

---

**End of file. Keep this at repo root.**
