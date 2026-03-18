# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leaf is a 3-phase self-discovery and personal growth course platform with AI-powered features. It uses a natural green leaf theme (primary: HSL 142 50% 40%) with nature-inspired iconography (Leaf, Sprout, TreePine from lucide-react).

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (starts on port 5000) |
| Build | `npm run build` |
| Type check | `npm run check` |
| Push DB schema | `npm run db:push` |
| E2E tests | `npm run test:e2e` |
| E2E tests (UI) | `npm run test:e2e:ui` |
| Production start | `npm run start` |

**Environment:** Requires `DATABASE_URL` env var. Dev server binds to `0.0.0.0:5000`.

## Architecture

### Stack
- **Frontend:** React 18 + TypeScript + Vite, Wouter routing, TanStack React Query, shadcn/ui (Radix + Tailwind CSS)
- **Backend:** Express.js + TypeScript (tsx runner), esbuild for production
- **Database:** PostgreSQL + Drizzle ORM, schema in `shared/schema.ts`, config in `drizzle.config.ts`
- **Auth:** Replit Auth via OpenID Connect + Passport.js + PostgreSQL session store
- **Payments:** Stripe (checkout sessions, webhooks)
- **AI:** OpenAI API (GPT-5.2) for chat and pattern analysis
- **E2E Tests:** Playwright (Chromium), tests in `e2e/`

### Directory Structure

```
client/src/          # React frontend
  App.tsx            # All routes defined here (wouter)
  components/        # UI components (shadcn/ui + custom)
  hooks/             # Custom hooks (use-return-to, use-unsaved-guard, etc.)
  lib/               # Utilities, queryClient, process-registry
  pages/             # Page components
server/
  index.ts           # Express server entry point
  routes/            # Modular API route files (one per domain)
    index.ts         # Registers all route modules
    helpers.ts       # Rate limiting & shared utilities
  storage.ts         # Database operations (storage interface abstraction)
  db.ts              # Drizzle DB connection
  stripeClient.ts    # Stripe setup
shared/
  schema.ts          # Drizzle ORM schema + Zod insert schemas (shared by client & server)
```

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets` → `attached_assets/`

### Key Patterns

**API routes** are modular files in `server/routes/`, each registered in `server/routes/index.ts`. All API endpoints are under `/api/`. Auth routes use `setupAuth()` and `registerAuthRoutes()` from `server/replit_integrations/auth/`.

**Client routes** are all in `client/src/App.tsx` using wouter. Protected routes wrap with `AuthenticatedRoute`. Unauthenticated users redirect to `/api/login`.

**Database operations** go through the storage interface in `server/storage.ts`, not direct DB queries in route handlers.

**Shared types** live in `shared/schema.ts` — Drizzle table definitions plus Zod schemas used by both client and server for validation.

## Navigation Framework

When adding or modifying process flows:

1. Register in `client/src/lib/process-registry.ts`
2. Launch links must use `buildProcessUrl(path, currentPath)` to embed `returnTo`
3. Completion must call `useReturnTo(fallback).finish()` to return to origin
4. All AppLayout nav links must use `safeNavigate()` — never raw `<Link>` or `setLocation()`
5. Full-page processes with data entry: register with `useUnsavedGuard()`
6. Modal processes with data entry: intercept dialog close with confirmation dialog

## Feature Domain Map

Routes are split by domain: `billing`, `journals`, `eisenhower`, `empathy`, `habits`, `identity`, `tools`, `onboarding`. Each has a corresponding file in `server/routes/`.

**Habit completion** uses click-through cycling (not dropdowns). Binary habits cycle: blank→Done→Skip→blank. Non-binary: blank→Full→Min→Skip→blank. Same system applies to Eisenhower Q1/Q2 items.

**Journals** store structured data as JSON with morning/evening session types.

**Plan versioning** snapshots identity doc, monthly goal, quarterly goal, and active habits as JSONB in `plan_versions` table.

## Lessons Learned

### Habit Filtering is Date-Aware
Never filter habits with just active=true. Historical views must show habits that were active during that specific time period using startDate/endDate ranges. Only the current week enforces max 3 active habits.

### Habit Filtering Must Be Consistent Across All Views
The canonical habit filtering logic lives in `journal-hub.tsx` (activeHabits useMemo). Any page that displays habits in a weekly calendar **must** apply the same rules: (1) current/future weeks filter to `active === true` only, (2) cap at 3 most recent, (3) deduplicate by lineageId, (4) past weeks show all overlapping habits. When adding or modifying any habit display, always cross-check against `journal-hub.tsx` to prevent divergence.

## Additional Documentation

Detailed docs are in the `docs/` directory: `TECH-STACK.md`, `ROUTES.md`, `DATA-MODEL.md`, `SECURITY.md`, `PAYMENT-FLOW.md`, `PAYWALL-UX.md`, `EXPORTS.md`.
