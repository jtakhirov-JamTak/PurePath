---
name: add-access-check
description: Add hasAccess enforcement to a route file — ensures non-paying users can't access protected features
---

# Add Access Check to Route

Add `hasAccess` enforcement to a route file so non-paying users can't access protected features.

## Pattern

Every protected route handler should check access after authentication:

```typescript
// After isAuthenticated middleware, inside the route handler:
const userId = req.user!.claims.sub;
const hasAccess = await storage.hasAccess(userId);
if (!hasAccess) {
  return res.status(403).json({ error: "Access required" });
}
```

## Steps

1. Identify the route file to update (e.g., `server/routes/habits.ts`)
2. Find all route handlers that should be protected (GET, POST, PATCH, DELETE)
3. Add the access check after the `userId` extraction, before any data operations
4. Skip adding to routes that already have the check (like journals.ts)
5. Run `npm run check` to verify no type errors
6. Run existing tests to verify nothing broke

## Routes that need this check (known gaps)
- `server/routes/eisenhower.ts` — all endpoints
- `server/routes/habits.ts` — all endpoints
- `server/routes/tools.ts` — all endpoints
- `server/routes/identity.ts` — all endpoints
- `server/routes/onboarding.ts` — all endpoints
- `server/routes/export.ts` — export endpoint

## Do NOT add to
- `server/routes/access.ts` — this IS the access check endpoint
- `server/routes/admin.ts` — admin has separate auth
- Auth routes — login/register/logout must work without access
