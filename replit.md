# Inner Journey - Self-Discovery Course Platform

## Overview

Inner Journey is a self-discovery and personal growth course platform that sells digital courses with integrated AI-powered features. The application offers two main courses: an AI chat-based self-discovery guide (Course 1) and a daily journaling system (Course 2), available individually or as a bundle. Users authenticate via Replit Auth, purchase courses through Stripe, and access their content through a personalized dashboard.

## Recent Changes (Feb 4, 2026)

- Modal-based paywall UX implementation:
  - Created LockedCourseModal component showing purchase options when users access locked courses
  - Modal offers individual course purchase or bundle option with savings highlight
  - Return URL stored in localStorage before checkout, auto-redirect back after successful payment
  - Fixed route ordering in App.tsx to ensure /checkout/success matches before /checkout/:courseType
  - Updated course pages to use modal overlay instead of full-page locked state

- Production-readiness improvements based on code review:
  - Added CHECK constraint on purchases.course_type (enforces 'course1', 'course2', 'bundle')
  - Added UNIQUE INDEX on journals (user_id, date, session) for safe upserts
  - Refactored Stripe checkout to support stable Price IDs from env vars (STRIPE_PRICE_COURSE1, etc.)
  - Updated documentation for consistency (ROUTES.md, DATA-MODEL.md, EXPORTS.md, PAYMENT-FLOW.md)
  - Removed unused chat integration files for cleaner codebase

## Previous Changes (Feb 3, 2026)

- Payment reliability improvements:
  - Idempotent webhook processing with unique constraint on stripe_session_id
  - New /billing page showing purchase history and access status
  - "Refresh Access" button for users experiencing payment unlock issues
  - Server-side entitlement re-checking via /api/billing/refresh endpoint

## Previous Changes (Feb 2, 2026)

- Complete platform implementation with landing page, checkout flow, dashboard
- Course 1: GPT-powered self-discovery chat with streaming responses (gpt-5.2)
- Course 2: Calendar-based journaling with morning/evening sessions and export
- Stripe payment integration with checkout sessions
- Calming teal/lavender theme with Plus Jakarta Sans typography
- Payment-gated access enforced server-side

## Course Pricing

- Course 1 (Self-Discovery GPT): $49
- Course 2 (Transformation Journal): $39
- Complete Bundle: $69 (saves $19)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints under `/api/` prefix with JSON payloads
- **Authentication**: Replit Auth via OpenID Connect with Passport.js, session-based with PostgreSQL session store
- **AI Integration**: OpenAI API (via Replit AI Integrations) for chat-based self-discovery features
- **Build Process**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared types, `shared/models/` for domain-specific models
- **Tables**: 
  - `users` and `sessions` (Replit Auth)
  - `purchases` (course access tracking)
  - `journals` (daily journaling entries)
  - `chatMessages` (AI chat history)
  - `conversations` and `messages` (general chat storage)

### Authentication Flow
- Replit Auth handles user identity via OIDC
- Sessions stored in PostgreSQL via `connect-pg-simple`
- `isAuthenticated` middleware protects API routes
- User data upserted on each login

### Key Design Patterns
- **Shared Types**: TypeScript types and Zod schemas shared between client and server via `shared/` directory
- **Storage Interface Pattern**: Database operations abstracted behind interface (e.g., `IStorage`, `IAuthStorage`)
- **Protected Routes**: Client-side `AuthenticatedRoute` component redirects unauthenticated users
- **Streaming Responses**: AI chat uses streaming for real-time message delivery

## External Dependencies

### Third-Party Services
- **Stripe**: Payment processing for course purchases (via Replit Connectors)
- **OpenAI**: AI chat completions for self-discovery guide (via Replit AI Integrations)
- **Replit Auth**: User authentication and identity management

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and migrations

### Key npm Packages
- `express` / `express-session`: Web server and session management
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod schema generation
- `@tanstack/react-query`: Client-side data fetching and caching
- `openai`: AI API client
- `stripe`: Payment processing
- `passport` / `openid-client`: Authentication

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL
- Replit-managed: `REPL_ID`, `ISSUER_URL`, Stripe connector credentials