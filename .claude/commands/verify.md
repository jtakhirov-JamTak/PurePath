---
name: verify
description: Quick health check — types, tests, build
---

Verify the app is healthy. Fix issues as you find them:

```bash
git diff --stat
```

1. Run `npm run check` — fix TypeScript errors
2. Run `npm run test` — fix failing unit tests
3. Run `npm run build` — verify production build

Fix and re-run until clean. Max 3 attempts per issue.

Report: **ALL PASS** or list remaining failures.
