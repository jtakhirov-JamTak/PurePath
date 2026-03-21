---
name: add-endpoint
description: Scaffold a new API endpoint following Leaf patterns
---

When I describe a new API endpoint, follow these steps in order:

```bash
cat server/routes/index.ts
```

1. Add the Zod validation schema to `server/validation.ts`
2. If new DB operations are needed:
   - Add the method signature to the `IStorage` interface in `server/storage.ts`
   - Implement it in the `DatabaseStorage` class
3. Add the route handler in the appropriate `server/routes/{domain}.ts`
4. If it's a new domain, create the file and register it in `server/routes/index.ts`
5. Always include: `isAuthenticated` middleware, userId filtering, Zod validation, proper error responses
6. Run `npm run check` to verify types

Endpoint to add: $ARGUMENTS
