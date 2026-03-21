---
name: build-validator
description: Validate production build succeeds
---

1. Run `npm run build`
2. If it fails, diagnose and fix the build error
3. Re-run until build succeeds or you've tried 3 times
4. Check the `dist/` output exists and has `index.cjs` and `public/` with assets
5. Report: **BUILD PASS** or **BUILD FAIL** with details
