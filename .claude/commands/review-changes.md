---
name: review-changes
description: Code review uncommitted changes with suggestions
---

Review all uncommitted changes for quality, bugs, and security:

```bash
git diff
git diff --stat
```

For each changed file check:
1. **Bugs** — logic errors, off-by-one, null handling, async issues
2. **Security** — missing auth, userId filtering, input validation, data exposure
3. **Patterns** — does it follow existing codebase conventions?
4. **Habit filtering** — if touching habits, does it match `journal-hub.tsx` canonical logic?
5. **Simplicity** — is there a simpler way to do this?

Suggest specific improvements with code snippets.

Rate: **SHIP IT** / **NEEDS WORK** (with list) / **STOP** (has critical issues)
