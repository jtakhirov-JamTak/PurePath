# Tech Stack

## Overview

This document explains the technology choices for the Leaf platform and why each was selected.

---

## Frontend

### React 18 + TypeScript
**Why:** Industry-standard UI library with strong typing. TypeScript catches errors at compile time and improves developer experience with autocomplete.

### Vite
**Why:** Fast build tool with instant hot module replacement. Much faster than webpack for development.

### Wouter
**Why:** Lightweight routing library (~2KB). Simpler API than React Router, sufficient for most applications.

### TanStack React Query
**Why:** Handles server state, caching, and background refetching. Eliminates boilerplate for data fetching and provides loading/error states.

### shadcn/ui + Radix UI
**Why:** Accessible, unstyled component primitives. Copy-paste components that you own and can customize. No vendor lock-in.

### Tailwind CSS
**Why:** Utility-first CSS that keeps styles co-located with components. Faster iteration than traditional CSS. Built-in dark mode support.

### Framer Motion
**Why:** Animation library for React. Used for page transitions and UI interactions.

---

## Backend

### Express.js v5 + TypeScript
**Why:** Minimal, flexible Node.js framework. Easy to understand, well-documented, huge ecosystem.

### Drizzle ORM
**Why:** Type-safe SQL queries with excellent TypeScript integration. Generates types from schema automatically. Lightweight compared to Prisma.

### PostgreSQL
**Why:** Robust, full-featured relational database. Handles complex queries, transactions, and scales well. Managed by Replit.

---

## Auth & Access

### Auth: Replit Auth (migrating to Clerk)
**Why:** Zero-configuration authentication for Replit apps. Handles OAuth flow, session management, and user identity. Clerk migration planned for production independence.

### Access: Single-use access codes (replacing Stripe)
**Why:** Workshop attendees receive an access code that unlocks the app. Verified server-side, stored as `hasAccess` flag in `userSettings`. No payment processing needed — workshop fee is collected separately.

---

## External Services

### OpenAI API
**Why:** Language models for AI chat functionality. Streaming support for real-time responses.

**Integration:** Via Replit AI Integrations for automatic API key management.

---

## Environment Variables

**Critical Rule:** Never hardcode secrets. All credentials come from environment variables.

### Required Variables

| Variable | Purpose | Managed By |
|----------|---------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Replit |
| `SESSION_SECRET` | Session encryption key | User (set as secret) |
| `ACCESS_CODE` | Workshop access code | User (set as secret) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API access | Replit AI Integrations |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI API endpoint | Replit AI Integrations |
| `REPL_ID` | Replit app identifier | Replit |
| `ISSUER_URL` | Auth OIDC issuer | Replit |

---

## Build & Development

### Development
```bash
npm run dev
```
Runs Vite dev server and Express backend concurrently on port 5000.

### Production Build
```bash
npm run build
```
- Frontend: Vite bundles to `dist/public/`
- Backend: esbuild bundles to `dist/`

### Database Migrations
```bash
npm run db:push
```
Pushes Drizzle schema changes to PostgreSQL.

---

## Path Aliases

| Alias | Maps To | Usage |
|-------|---------|-------|
| `@/` | `client/src/` | Frontend components, hooks, utils |
| `@shared/` | `shared/` | Shared types, schemas |
| `@assets/` | `attached_assets/` | Static assets |

---

## Key Patterns

### Shared Types
Types defined in `shared/schema.ts` are used by both frontend and backend. This ensures API contracts are enforced at compile time.

### Storage Interface
Database operations go through an `IStorage` interface. This allows easy testing with mock implementations and potential database swaps.

### Centralized Middleware
Authentication and access checks use middleware functions, not per-route checks. This prevents security gaps from inconsistent implementations.

---

## Why This Stack?

1. **Type Safety:** TypeScript everywhere catches errors early
2. **Speed:** Vite + React Query = fast development and fast UX
3. **Simplicity:** Express + Drizzle = minimal abstraction layers
4. **Replit Integration:** Native support for auth, database, AI
5. **Maintainability:** Standard patterns, good documentation, active communities
