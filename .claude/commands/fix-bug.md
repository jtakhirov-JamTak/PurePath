---
name: fix-bug
description: Structured bug fixing with memory — tracks attempts and avoids rabbit holes
---

Help me fix this bug. Follow this process:

## Before starting
- Check memory for any previous attempts at this bug or similar bugs
- Check Lessons Learned in CLAUDE.md for related past fixes
- If this bug was attempted before, read what was tried and DON'T repeat failed approaches

## Process
1. **Reproduce:** Understand what's happening vs what should happen
2. **Locate:** Find the relevant code (check both client and server)
3. **Diagnose:** Identify the root cause — explain it briefly in plain English
4. **Fix:** Make the minimal change needed — don't touch unrelated code
5. **Verify:** Run `npm run check` to ensure no type errors

## Tracking attempts
After each failed attempt, save to memory:
- What the bug is
- What you tried
- Why it didn't work
- What you'd try next

This way, future sessions won't repeat the same dead ends.

## Rabbit hole prevention
- **Attempt 1:** Try the most obvious fix
- **Attempt 2:** If that didn't work, try the next best theory
- **Attempt 3:** If still broken, **STOP**. Tell me:
  - What you tried (all 3 attempts)
  - What you think the real problem might be
  - Whether this needs a different approach entirely
- Save all attempts to memory before stopping

## On success
- Save the lesson to memory AND to Lessons Learned in CLAUDE.md
- Include: what the bug was, what caused it, what fixed it

Bug description: $ARGUMENTS
