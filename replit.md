# Inner Journey - Self-Discovery Course Platform

## Overview

Inner Journey is a 3-phase self-discovery and personal growth course platform that integrates AI-powered features. It offers courses focused on self-reflection, personal structure, and transformation, available individually or as a bundle. The platform aims to guide users through a structured journey using tools like AI chat, journaling, goal setting, habit tracking, and analytical agents, ultimately fostering personal growth and self-discovery.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui built on Radix UI, styled with Tailwind CSS and CSS variables for theming.
- **Design System**: Single slate-blue accent, Inter for body, Plus Jakarta Sans for headings, 16px base font, 1.6 line-height, 12px border radius, unified icon palette.
- **Navigation Structure**: Three main tabs:
  - **Today** (default landing): Daily-focused dashboard with due habits, top 3 tasks, Q2 blocks, journal quick entry, quick tools
  - **Plan**: Vision board, monthly goal, habits overview, Eisenhower matrix links with inline planning wizard stepper
  - **Calendar** (`/journal`): Journal hub with morning/evening check-ins, journal calendar, plus links to Progress and Tools at the bottom
- **Key Features**:
  - **Goal Hierarchy System**: Integrates Quarterly, Monthly, and Daily goals. Includes a dedicated page for Monthly Goals and Quarterly Goals, and a dashboard card showing the hierarchical flow. Monthly goals have a required deadline date field displayed on Today and Plan pages.
  - **Goal-Setting Wizard** (`/goal-wizard`): 15-step self-guided "How to Set a Real Goal" exercise. Part 1 covers goal setting (strengths, precise goal definition, time horizon/deadline, success proof with metric/weekly behavior, best result with 15s visualization timer, inner obstacle with trigger/thought/emotion/behavior analysis, IF-THEN implementation plans). Part 2 covers mindset (values, prizes, fun). All fields required. Users without a complete monthly goal are automatically redirected here from the dashboard.
  - **Journaling**: Restructured Morning and Evening journals with detailed sections (e.g., Self-Awareness, Gratitude, Trigger Log, 80/20 Tracker). Data stored as JSON.
  - **Habit Tracking**: Recurring habits with day-of-week cadence, duration, categories (health, wealth, etc.), and daily tracking. Habits can be typed (goal/learning/maintenance). Completions support `completed` and `skipped` statuses (cycling click: blank → completed → skipped → blank). Each habit requires a "Motivating Reason" field.
  - **Voice Input**: Web Speech API integration via VoiceTextarea/VoiceInput components (`client/src/components/voice-input.tsx`). Available on all text fields across journals, goals, identity doc, habits, and dashboard. Mic button appears inline; gracefully hidden if browser doesn't support speech recognition. Falls back to MediaRecorder + OpenAI Whisper transcription via `/api/audio/transcribe` when Web Speech API is unavailable.
  - **Daily Tasks**: Up to 3 tasks per day with Eisenhower Matrix quadrant labels.
  - **Eisenhower Matrix**: Weekly priority planning with categories and goal alignment field for Q2 items. "Success Catalyst" flagging (formerly blocksGoal). Includes "Plan Week" wizard with 3-step guided flow: role selection, brain dump, and task classification into quadrants.
  - **Self-Development Tools**: Meditation, Emotional Processing, and Empathy modules.
  - **Regulation Now Page** (`/regulation`): Three quick regulation tools with expandable cards, circular timers, play/pause/reset.
  - **Quick Tools (Dashboard)**: All tool modals use a shared `ExerciseModal` shell (`client/src/components/exercise-modal.tsx`) that standardizes the flow: mood-before → exercise → mood-after → done. Each tool only defines its unique exercise content. Mood tracking hook in `client/src/hooks/use-mood-tracking.ts`. Tool modals extracted to `client/src/components/tools/`. Includes Emotional Containment (4-step FEEL→LABEL→REGULATE→MOVE), Micro-Movement (5 fixed options with timer/counter modes), Self-Compassion Break (Loved One Mirror with voice input, save-to-journal).
  - **Custom Tools**: Users can add up to 3 custom tools from their GPT course. Stored in `custom_tools` table. Duplicate name prevention server-side. Components in `client/src/components/tools/custom-tool-modal.tsx`.
  - **Mood Tracking**: 5-level mood scale (1-5) with emotion text captured before and after each exercise. Stored in `tool_usage_logs` table with CSV export. All tool usage is trackable via `/api/tool-usage` and exportable via `/api/tool-usage/export`.
  - **Journal Calendar**: Week view with horizontal grid. Habits sorted by timing (morning → daily → evening). Export with date range filters. Habits and scheduled items have 3-state tracking (completed/skipped/blank).
  - **Dashboard (Today)**: Redesigned vertical flow: 1-Year Vision → Q1-Q4 quarterly goals row → Monthly Promise → North Star (identity/values/intention with voice input) → Daily Habits (journals + habits with cycling status) → Weekly Items (Q2 focus + mini calendar) → Evening Reflection → Regulation Now link → Library link.
  - **Vision Board** (`/plan`): Single image upload stored as base64 in identity_documents table (visionBoardMain). Upload, replace, and remove functionality.
  - **Plan Wizard** (`/plan`): 5-step gated wizard (Vision→Quarterly→Monthly→Habits→Eisenhower) with step completion checks and navigation gating. Each step must be completed before the next unlocks.
  - **Plan Versioning**: Save/restore/clear plan data via `plan_versions` table. Snapshot stores identity doc, monthly goal, quarterly goal, and active habits as JSONB. Modes: save, save_and_copy, save_and_clear. Version list with restore/delete.
  - **Journaling as Habits**: AM/PM journal entries appear as system habits in dashboard's "Due Today" card with click-to-navigate and auto-complete status based on journal existence.
  - **Course Curriculum**: Collapsible phases with lesson overviews and video placeholders.
  - **Phase 3 Transformation**: Document upload for AI pattern analysis and downloadable reports.
  - **Navigation Framework**: Lightweight process navigation with two features:
    - **returnTo system** (`client/src/hooks/use-return-to.ts`): `useReturnTo(fallback)` hook reads `?returnTo=` query param from URL, validates it (must be internal path), provides `finish()` to navigate back. `buildProcessUrl(path, returnTo)` creates launch URLs. Used by goal-wizard, and launch links from dashboard/plan.
    - **Unsaved Changes Guard** (`client/src/hooks/use-unsaved-guard.tsx`): `UnsavedGuardProvider` wraps the app. Components call `useUnsavedGuard()` to get `register()/unregister()` for dirty state tracking, and `safeNavigate()` which shows Save/Discard/Cancel modal before navigating when dirty. Applied to goal-wizard and eisenhower wizard. All AppLayout nav links use `safeNavigate`. `beforeunload` handler fires when dirty.
    - **Process Registry** (`client/src/lib/process-registry.ts`): Lean metadata for all process flows (id, title, path, defaultReturnTo, requiresDirtyGuard). No route generation — routes still in App.tsx.

## Navigation Framework Rules

When adding or modifying any process flow, follow this checklist:

1. Register the process in `client/src/lib/process-registry.ts`
2. Launch links must use `buildProcessUrl(path, currentPath)` to embed returnTo
3. Completion must call `useReturnTo(fallback).finish()` to return to origin
4. All AppLayout nav links must use `safeNavigate()` — never raw `<Link>` or `setLocation()`
5. Full-page processes with data entry: register with `useUnsavedGuard()`
6. Modal processes with data entry: intercept dialog close with confirmation dialog
7. Run `npm run verify` after changes

See `.local/skills/process-framework/SKILL.md` for code patterns and examples.

### Backend Architecture
- **Framework**: Express.js with TypeScript and Node.js.
- **API Design**: RESTful endpoints under `/api/` using JSON payloads.
- **Authentication**: Replit Auth via OpenID Connect with Passport.js and PostgreSQL session store.
- **AI Integration**: OpenAI API (gpt-5.2) for chat and pattern analysis.
- **Build Process**: esbuild for server, Vite for client.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Key Tables**: `users`, `sessions`, `purchases`, `journals`, `chatMessages`, `eisenhower_entries`, `empathy_exercises`, `habits`, `habit_completions`, `tasks`, `monthly_goals`, `quarterly_goals`, `identity_documents`, `plan_versions`, `tool_usage_logs`, `custom_tools`.
- **Shared Types**: TypeScript types and Zod schemas shared between client and server.

### Key Design Patterns
- **Protected Routes**: Client-side `AuthenticatedRoute` component.
- **Streaming Responses**: AI chat and Phase 3 analysis for real-time delivery.

## External Dependencies

### Third-Party Services
- **Stripe**: Payment processing for course purchases.
- **OpenAI**: AI chat completions and pattern analysis (GPT-5.2).
- **Replit Auth**: User authentication and identity management.

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe database queries.

### Key npm Packages
- `express`, `express-session`
- `drizzle-orm`, `drizzle-zod`
- `@tanstack/react-query`
- `openai`
- `stripe`
- `passport`, `openid-client`