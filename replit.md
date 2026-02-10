# Inner Journey - Self-Discovery Course Platform

## Overview

Inner Journey is a 3-phase self-discovery and personal growth course platform with AI-powered features. The platform offers Phase 1+2 (Self-Reflection & Structure) and Phase 3 (Transformation), available individually or as an all-in-one bundle. Users authenticate via Replit Auth, purchase courses through Stripe, and access their content through a personalized dashboard.

## Recent Changes (Feb 10, 2026)

- **Journal Calendar** redesigned:
  - Default view is now **week** (7-day view), with zoom out/in button to toggle to **month** view
  - Habits automatically appear on calendar days they're scheduled for, shown as colored dots
  - Journaling (morning + evening) shown as baseline required items every day
  - Eisenhower Q2 scheduled items with deadlines appear on their scheduled date
  - Day detail dialog shows all requirements: journal sessions, habits, Q2 items with completion status
  - Progress counter (completed/total) shown on each day in week view
- **Dashboard side panel** ("Today's Progress"):
  - Sticky right sidebar showing today's required items grouped by Journals, Habits, Q2 items
  - Status badges: "Done" (green), "Behind" (red, based on time of day), "To Do" (neutral)
  - Progress bar with completed/total count
- **Eisenhower Matrix** "Role" renamed to "Category" matching the 6 habit categories with color-coded badges
- **Habit editing** - pencil icon on each habit card opens pre-filled dialog for updates
- New API: `/api/habit-completions/range/:startDate/:endDate` for fetching completions across a date range

## Previous Changes (Feb 9, 2026)

- Separated Habits and Tasks into two distinct pages:
  - **Habits** (/habits): Up to 5 recurring habits (recommend starting with 3)
    - Day-of-week cadence picker (toggle individual days)
    - Recurring: "No End Date" or "Weeks" with count
    - Duration in minutes
    - Optional start/end time (15-min intervals, for calendar integration)
    - **Categories**: health, wealth, relationships, career, mindfulness, learning — each with a distinct color
    - **Daily Tracker**: Check off habits each day, shows only habits scheduled for the current day, with progress bar and date navigation
  - **Daily Tasks** (/tasks): Standalone page with up to 3 tasks per day, Eisenhower quadrant labels
  - Dashboard and Course page updated with separate Habits and Tasks cards
- Eisenhower Matrix: replaced free-text time fields with 15-min interval start/end time selectors, auto-calculated duration

## Previous Changes (Feb 6, 2026)

- Restructured entire course system from 2-course model to 3-phase model:
  - **Phase 1+2** (Self-Reflection & Structure): $399 - Includes GPT chat, journaling, and all tools
  - **Phase 3** (Transformation): $299 - AI pattern analysis agent with document upload
  - **All-in-One Bundle**: $499 (saves $199) - Everything included
  - Legacy purchase types (course1, course2, bundle) maintained for backward compatibility

- New pages and routes:
  - **Course Curriculum** (/course): Collapsible phase sections with lesson overview and video placeholders
  - **Phase 3 Transformation** (/phase3): Document upload, AI pattern analysis, downloadable reports
  - Both pages use streaming GPT-5.2 responses for AI features

- Tasks page enhanced with Eisenhower quadrant labels:
  - Q1-Q4 quadrant selection for each task
  - Q2 tasks require a scheduled time input
  - Visual quadrant badges displayed on task cards
  - Quadrant legend at bottom of tasks view

- Updated all access checks across application:
  - phase12 or allinone grants access to GPT chat, journal, and tools
  - phase3 or allinone grants access to transformation agent
  - Legacy course1/course2/bundle types still work

- Updated landing page, dashboard, checkout, billing, and locked course modal for new pricing

## Previous Changes (Feb 4, 2026)

- Added Self-Development Tools module with 5 free tools:
  - **Meditation** (/meditation): Integrative meditation with embedded YouTube black noise audio
  - **Emotional Processing** (/emotional-processing): 4-step containment process
  - **Eisenhower Matrix** (/eisenhower): Weekly priority planning by roles and quadrants
  - **Empathy Module** (/empathy): Structured reflection form for interpersonal interactions
  - **Habits** (/habits): Up to 5 recurring habits with day-of-week cadence, duration, optional time
  - **Daily Tasks** (/tasks): Up to 3 daily tasks with Eisenhower quadrant labels

- UI modernization: AppHeader component, user dropdown, sticky header, gradient icons
- Modal-based paywall UX with LockedCourseModal component
- Production-readiness improvements: CHECK constraints, UNIQUE indexes, stable Stripe Price IDs

## Course Structure

### Phase 1: Self-Reflection
- Lesson 1: "Who Am I?" - Video placeholder + Self-Discovery GPT chat
- Lesson 2: "Who Do I Want To Be?" - Video placeholder + Self-Discovery GPT chat (same GPT as Lesson 1)

### Phase 2: Structure
- Lesson 3: "How To Get There" - Video placeholder
- Tools: Journaling, Meditation, Emotional Integration, Eisenhower Matrix, Habits, Daily Tasks

### Phase 3: Transformation
- Lesson: "You Are Your Patterns" - Video placeholder
- Transformation Agent: Upload docs (.txt, .md, .doc, .docx, max 100KB) for AI pattern analysis and downloadable report

## Course Pricing

- Phase 1+2 (Self-Reflection & Structure): $399
- Phase 3 (Transformation): $299
- All-in-One Bundle: $499 (saves $199)

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
- **AI Integration**: OpenAI API (via Replit AI Integrations) for chat and pattern analysis features
- **Build Process**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared types
- **Tables**: 
  - `users` and `sessions` (Replit Auth)
  - `purchases` (course access tracking - supports phase12, phase3, allinone, and legacy types)
  - `journals` (daily journaling entries)
  - `chatMessages` (AI chat history)
  - `eisenhower_entries` (weekly priority planning)
  - `empathy_exercises` (interpersonal reflection)
  - `habits` (recurring habits with day-of-week cadence, duration, optional start/end time, category)
  - `habit_completions` (daily habit check-offs, unique per user/habit/date)
  - `tasks` (daily tasks with quadrant labels)

### Key Routes
- `/` - Landing page (unauthenticated) or Dashboard (authenticated)
- `/course` - Course curriculum with all 3 phases
- `/course1` - Self-Discovery GPT chat
- `/course2` - Transformation Journal (calendar + entries)
- `/phase3` - Phase 3 Transformation Agent (doc upload + AI analysis)
- `/checkout/:courseType` - Stripe checkout (phase12, phase3, allinone)
- `/billing` - Purchase history and access status
- `/meditation`, `/emotional-processing`, `/eisenhower`, `/empathy`, `/habits`, `/tasks` - Free tools
- `/journal/:date/:session` - Individual journal entries

### Authentication Flow
- Replit Auth handles user identity via OIDC
- Sessions stored in PostgreSQL via `connect-pg-simple`
- `isAuthenticated` middleware protects API routes
- User data upserted on each login

### Key Design Patterns
- **Shared Types**: TypeScript types and Zod schemas shared between client and server via `shared/` directory
- **Storage Interface Pattern**: Database operations abstracted behind interface (e.g., `IStorage`, `IAuthStorage`)
- **Protected Routes**: Client-side `AuthenticatedRoute` component redirects unauthenticated users
- **Streaming Responses**: AI chat and Phase 3 analysis use streaming for real-time message delivery

## External Dependencies

### Third-Party Services
- **Stripe**: Payment processing for course purchases (via Replit Connectors)
- **OpenAI**: AI chat completions and pattern analysis (via Replit AI Integrations, model: gpt-5.2)
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
