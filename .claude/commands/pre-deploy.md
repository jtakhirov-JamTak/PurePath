---
name: pre-deploy
description: Pre-deployment checklist with auto-fix
---

Run through this checklist before deploying. Fix issues as you find them:

```bash
git diff --stat
git log --oneline -10
```

1. Run `npm run check` — fix any TypeScript errors, re-run until clean
2. Run `npm run test` — fix any failing unit tests, re-run until clean
3. Run `npm run build` — verify production build succeeds
4. Check for console.log statements that should be removed
5. Check for hard-coded test data or debug values
6. Check for security issues in changed files (missing auth, exposed data)
7. Summarize what changed since last deploy

Report: **READY** or **NOT READY** with remaining issues.

Max 3 fix attempts per issue — if stuck, report and stop.
