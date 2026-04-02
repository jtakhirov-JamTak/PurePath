# CLAUDE.md

## Project Overview
Leaf — One live 3.5-hour workshop ($899) + mobile-first daily practice app (PWA).
Users journal, track habits, set goals, and build self-awareness through structured exercises.
Data is mechanistic/structured for future AI pattern analysis.

Solo founder, low technical experience — explain briefly before making changes.
When Claude makes a mistake, add the lesson to the "Lessons Learned" section below.

## Commands
| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 5000) |
| Build | `npm run build` |
| Type check | `npm run check` |
| DB schema push | `npm run db:push` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |

Environment: Requires `DATABASE_URL`. Dev server binds to `0.0.0.0:5000`.

## Stack
- **Frontend:** React 18, TypeScript, Vite, Wouter, TanStack React Query, shadcn/ui, Tailwind, Framer Motion
- **Backend:** Express v5, TypeScript (tsx runner), esbuild production build
- **DB:** PostgreSQL + Drizzle ORM — schema in `shared/schema.ts`
- **Auth:** Replit Auth (OIDC + Passport.js + PG session store)
- **Access:** Single-use access codes (workshop attendees)
- **AI:** OpenAI API (chat, voice, image, task suggestions)
- **Tests:** Vitest (unit), Playwright (e2e)

## Directory Structure
```
client/src/pages/          # One file per page (monolithic — state + UI + logic)
client/src/components/     # Shared components + shadcn/ui in components/ui/
client/src/components/ui/  # shadcn/ui — do NOT modify directly
client/src/hooks/          # use-auth, use-return-to, use-unsaved-guard, use-toast
client/src/lib/            # queryClient, process-registry, utils
server/routes/             # One file per domain (habits, journals, eisenhower, etc.)
server/routes/helpers.ts   # Rate limiters, CSV escape, ID parsing
server/storage.ts          # IStorage interface — ALL db ops go here, never direct queries
server/validation.ts       # All Zod schemas for request validation
server/replit_integrations/# Auth, audio, image, batch processing
shared/schema.ts           # Drizzle tables + Zod insert schemas (shared client/server)
e2e/                       # Playwright tests + helpers.ts with mock utilities
docs/                      # Detailed docs (TECH-STACK, ROUTES, DATA-MODEL, SECURITY, etc.)
```
Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets` → `attached_assets/`

## Adding an API Endpoint
1. Zod schema → `server/validation.ts`
2. Storage method → `IStorage` + `DatabaseStorage` in `server/storage.ts`
3. Route handler → `server/routes/{domain}.ts` with `isAuthenticated` + userId filter
4. Register in `server/routes/index.ts` if new domain file

## Adding a Page
1. Page component → `client/src/pages/`
2. Route → `App.tsx` wrapped in `AccessGatedRoute`
3. Process flow? Register in `process-registry.ts`, use `buildProcessUrl()` + `useReturnTo()`
4. Nav entry → `app-layout.tsx` using `safeNavigate()` (NEVER raw `<Link>`)
5. Data entry? Use `useUnsavedGuard()` for dirty form protection

## Data Flow
- Server state: `useQuery` / `useMutation` via TanStack React Query
- Query keys = API paths: `["/api/habits"]`, `["/api/journals"]`
- Mutations: `apiRequest()` then `invalidateQueries()` on success
- Local UI state: plain `useState` — no global store

## Habit System (CRITICAL)
- Versioning via lineageId + versionNumber — changing [name, category, cadence, timing, duration, isBinary] archives old, creates new
- Max 3 active habits. Completion cycling: Binary: blank→Done→Skip. Non-binary: blank→Full→Min→Skip
- Current weeks: active===true, max 3, dedupe by lineageId. Past weeks: all overlapping habits
- Canonical filtering: `journal-hub.tsx` activeHabits useMemo — always cross-check

## Do's
- Run `npm run check` before considering work complete
- Explain briefly what you're doing and why before making changes
- Save bug fixes and lessons to memory AND to "Lessons Learned" below
- Proactively flag security/privacy concerns — app stores sensitive personal data
- For non-trivial features, start in Plan mode (Shift+Tab twice) before coding
- Use the storage interface — never direct DB queries in routes

## Don'ts
- Don't rabbit-hole — if fix fails after 2-3 attempts, stop and reassess
- Don't over-engineer — MVP, keep it simple
- Don't modify shadcn/ui components in `components/ui/`
- Don't skip Zod validation on any endpoint
- Don't create new state management patterns — React Query for server state

## Security Rules
- All routes: `isAuthenticated` + userId filtering. Never trust client-provided userId
- Validate all input with Zod before DB ops
- Never log or expose user content (journals, emotions, triggers) in errors
- Rate limit AI/export endpoints (see `routes/helpers.ts`)

## Deployment
Claude Code → push to GitHub (main) → pull in Replit shell → auto-deploy

## Lessons Learned
- Habit filtering must be consistent across all views — canonical logic in journal-hub.tsx
- Auto-created eisenhower entries (e.g. from monthly goal nextConcreteStep) must dedupe before POSTing — re-saving the goal duplicated items on the calendar
- Dashboard Daily Contract (or any "today's commitment" UI) must derive from `todayFocusItems` pinned to `todayStr`, not `focusItems` which follows `selectedDate` in the week strip
- Trigger log section in evening journal is a KEEP — only the standalone Trigger Log tool/modal was removed, not the embedded evening journal trigger section ("What got in the way?")
- (Add new lessons here as they arise)

## Docs
See `docs/` for: TECH-STACK, ROUTES, DATA-MODEL, SECURITY, EXPORTS
