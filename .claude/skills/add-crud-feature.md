---
name: add-crud-feature
description: Build a complete CRUD feature — table, API, page — following Proof Arc patterns
---

# Add CRUD Feature

Build a complete CRUD feature following Proof Arc's established patterns.

## Inputs needed:
- Feature name (e.g., "reflections")
- Fields and their types
- Which page it belongs to (new page or existing)

## Steps:

### 1. Database Layer
- Add Drizzle table to `shared/schema.ts` with userId, createdAt fields
- Add Zod insert schema with `createInsertSchema()` from drizzle-zod
- Export both the table and insert schema
- Add storage methods to `IStorage` interface and `DatabaseStorage` in `server/storage.ts`

### 2. Server Layer
- Add Zod validation schemas to `server/validation.ts`
- Create route file in `server/routes/{feature}.ts`
- Implement: GET (list by userId), POST (create), PATCH (update), DELETE
- All routes: `isAuthenticated` middleware, userId filtering from `req.user.claims.sub`, Zod validation
- Register routes in `server/routes/index.ts`

### 3. Client Layer
- Create page in `client/src/pages/{feature}.tsx`
- Use `useQuery` for data fetching with key `["/api/{feature}"]`
- Use `useMutation` + `apiRequest` for mutations
- `invalidateQueries` on mutation success
- Add route in `App.tsx` with `AccessGatedRoute`
- Add nav entry in `app-layout.tsx` with `safeNavigate`
- Wrap in `<AppLayout>` for standard pages or `<FlowBar>` for process pages

### 4. Verify
- Run `npm run check` — fix any type errors
- Run `npm run db:push` — sync schema to database
- Run `npm run build` — verify production build
