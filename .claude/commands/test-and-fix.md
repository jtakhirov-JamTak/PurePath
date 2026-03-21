---
name: test-and-fix
description: Run all tests, fix failures, repeat until clean
---

Run the full test suite and fix failures. Loop until clean:

1. Run `npm run check` — fix TypeScript errors
2. Run `npm run test` — fix failing unit tests
3. Run `npm run test:e2e` — fix failing E2E tests
4. After each fix, re-run to confirm the fix didn't break something else

Max 3 fix attempts per failure — if stuck, report the issue and stop.

Report: what failed, what you fixed, what's still broken (if anything).
