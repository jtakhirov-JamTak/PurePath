---
name: verify-app
description: End-to-end app verification — types, tests, build
---

Verify the app works correctly end-to-end:

1. Run `npm run check` — TypeScript must pass
2. Run `npm run test` — unit tests must pass
3. Run `npm run build` — production build must succeed
4. Run `npm run test:e2e` — E2E tests must pass
5. Check for `console.log` / `console.error` statements in changed files that shouldn't ship
6. Check for TODO or FIXME comments in changed files

If anything fails, fix it and re-run. Max 3 attempts per issue.
Report final status: **ALL PASS** or list remaining failures.
