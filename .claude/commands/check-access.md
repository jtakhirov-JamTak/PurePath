---
name: check-access
description: Scan all route files for missing hasAccess checks — find security gaps
---

Audit every route file in `server/routes/` to ensure all protected endpoints enforce `hasAccess`.

## Steps

1. Read every file in `server/routes/`
2. For each route handler, check if it calls `storage.hasAccess(userId)` before doing any work
3. Skip routes that should NOT have the check:
   - `access.ts` — this IS the access check endpoint
   - `admin.ts` — uses separate `isAdmin` middleware
   - Auth routes (login, register, logout) — must work without access
4. Flag any route handler missing the check

## Report format

```
✅ server/routes/journals.ts — all endpoints check hasAccess
❌ server/routes/habits.ts — GET /api/habits missing hasAccess
❌ server/routes/habits.ts — POST /api/habits missing hasAccess
```

## After reporting
- Count total endpoints checked
- Count gaps found
- Ask if user wants to fix them (use add-access-check skill)
