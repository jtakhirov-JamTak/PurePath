---
name: add-table
description: Add a new database table with Drizzle ORM
---

When I describe a new database table:

```bash
tail -30 shared/schema.ts
```

1. Add the Drizzle table definition to `shared/schema.ts` with userId and createdAt fields
2. Add the Zod insert schema using `createInsertSchema()` from drizzle-zod
3. Export both the table and insert schema
4. Add storage methods to `IStorage` interface and `DatabaseStorage` in `server/storage.ts`
5. Run `npm run db:push` to sync schema to database
6. Run `npm run check` to verify types

Table to add: $ARGUMENTS
