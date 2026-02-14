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
- **Navigation Structure**: Two main groups:
  - **Action**: Plan, Journal Calendar, Today
  - **Learning**: Learn, Coach, Tools
  - Library section removed; "How to Set a Goal" and "Journaling Framework" moved to Tools.
- **Key Features**:
  - **Goal Hierarchy System**: Integrates Quarterly, Monthly, and Daily goals. Includes a dedicated page for Monthly Goals and Quarterly Goals, and a dashboard card showing the hierarchical flow.
  - **Journaling**: Restructured Morning and Evening journals with detailed sections (e.g., Self-Awareness, Gratitude, Trigger Log, 80/20 Tracker). Data stored as JSON.
  - **Habit Tracking**: Recurring habits with day-of-week cadence, duration, categories (health, wealth, etc.), and daily tracking. Habits can be typed (goal/learning/maintenance). Completions support `completed` and `skipped` statuses (cycling click: blank → completed → skipped → blank).
  - **Daily Tasks**: Up to 3 tasks per day with Eisenhower Matrix quadrant labels.
  - **Eisenhower Matrix**: Weekly priority planning with categories and goal alignment field for Q2 items. "Success Catalyst" flagging (formerly blocksGoal).
  - **Self-Development Tools**: Meditation, Emotional Processing, and Empathy modules.
  - **Journal Calendar**: Week view with horizontal grid. Habits sorted by timing (morning → daily → evening). Export with date range filters. Habits and scheduled items have 3-state tracking (completed/skipped/blank).
  - **Dashboard**: "Today's Progress" sidebar showing required items (journals, habits, Q2) with status.
  - **Course Curriculum**: Collapsible phases with lesson overviews and video placeholders.
  - **Phase 3 Transformation**: Document upload for AI pattern analysis and downloadable reports.

### Backend Architecture
- **Framework**: Express.js with TypeScript and Node.js.
- **API Design**: RESTful endpoints under `/api/` using JSON payloads.
- **Authentication**: Replit Auth via OpenID Connect with Passport.js and PostgreSQL session store.
- **AI Integration**: OpenAI API (gpt-5.2) for chat and pattern analysis.
- **Build Process**: esbuild for server, Vite for client.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM.
- **Key Tables**: `users`, `sessions`, `purchases`, `journals`, `chatMessages`, `eisenhower_entries`, `empathy_exercises`, `habits`, `habit_completions`, `tasks`, `monthly_goals`, `quarterly_goals`, `identity_documents`.
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