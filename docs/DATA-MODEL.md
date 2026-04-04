# Data Model

## Overview

This document describes the database schema, relationships, and key design decisions.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │───────│  journals   │       │userSettings  │
│             │  1:N  │             │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
      │                                           │
      │ 1:N                                       │ 1:1
      │                                           │
┌─────────────┐                             ┌─────────────┐
│   sessions  │                             │    users    │
└─────────────┘                             └─────────────┘

┌─────────────┐       ┌─────────────┐
│   habits    │───────│ completions │
│             │  1:N  │             │
└─────────────┘       └─────────────┘
```

---

## Tables

### users

Stores authenticated user information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY | UUID generated at registration |
| email | VARCHAR | UNIQUE | User's email address |
| first_name | VARCHAR | | First name |
| last_name | VARCHAR | | Last name |
| password_hash | VARCHAR(255) | | bcryptjs hash (cost 12) |
| profile_image_url | VARCHAR | | Avatar URL |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | | Last update time |

**Notes:**
- ID is a UUID string generated at registration via `crypto.randomUUID()`
- Password hash stored using bcryptjs (cost 12), never returned in API responses

### sessions

Stores user sessions for authentication persistence.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| sid | VARCHAR | PRIMARY KEY | Session ID |
| sess | JSON | NOT NULL | Session data |
| expire | TIMESTAMP | NOT NULL | Expiration time |

**Notes:**
- Managed by `connect-pg-simple`
- Automatic cleanup of expired sessions

### userSettings

Stores per-user settings including access status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL, UNIQUE | User reference |
| onboarding_step | INTEGER | DEFAULT 0 | Current onboarding step |
| onboarding_complete | BOOLEAN | DEFAULT false | Whether onboarding is done |
| has_access | BOOLEAN | DEFAULT false | Whether user has app access (set via access code) |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Notes:**
- `hasAccess` is set to `true` when a valid access code is verified
- One row per user (UNIQUE on user_id)

### journals

Stores daily journal entries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL | Entry author |
| date | DATE | NOT NULL | Entry date |
| session | VARCHAR | NOT NULL | 'morning' or 'evening' |
| gratitude | TEXT | | What I'm grateful for |
| intentions | TEXT | | Daily intentions |
| reflections | TEXT | | Reflections on the day |
| highlights | TEXT | | Day's highlights |
| challenges | TEXT | | Challenges faced |
| content | TEXT | | Structured JSON content |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last edit time |

**Notes:**
- UNIQUE INDEX on (user_id, date, session) enforces one entry per user per date per session
- CHECK constraint enforces session IN ('morning', 'evening')
- `content` stores structured JSON for newer entry formats

### habits

Stores weekly recurring habits.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL | Habit owner |
| name | VARCHAR(200) | NOT NULL | Habit name |
| category | VARCHAR(30) | DEFAULT 'health' | health, wealth, relationships, self-development, happiness |
| timing | VARCHAR(20) | DEFAULT 'afternoon' | morning, afternoon, evening |
| cadence | VARCHAR(50) | NOT NULL | Frequency description |
| duration | INTEGER | | Duration in minutes |
| start_date | VARCHAR(10) | | When habit started |
| end_date | VARCHAR(10) | | When habit was archived |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| is_binary | BOOLEAN | DEFAULT false | Simple done/not-done vs. levels |
| active | BOOLEAN | DEFAULT true | Whether habit is current |
| lineage_id | VARCHAR(36) | | Groups versions of same habit |
| version_number | INTEGER | DEFAULT 1 | Version within lineage |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

### habitCompletions

Stores daily habit check-offs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL | User reference |
| habit_id | INTEGER | NOT NULL | Habit reference |
| date | DATE | NOT NULL | Completion date |
| status | VARCHAR(20) | DEFAULT 'completed' | completed, skipped, minimum |
| completion_level | INTEGER | | Completion level |
| skip_reason | VARCHAR(100) | | Why skipped |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

### eisenhowerEntries

Weekly planning tasks organized by Eisenhower matrix quadrants.

### empathyExercises

EQ module — prep and debrief exercises for interpersonal interactions.

### monthlyGoals

One goal document per user per month with goal statement, obstacles, IF-THEN plans.

### identityDocuments

One per user — identity statement, vision, values, strengths, patterns.

### triggerLogs

Emotional trigger tracking with emotion/urge intensity and recovery.

### avoidanceLogs

Avoidance pattern tracking with discomfort rating and exposure steps.

### toolUsageLogs

Tracks usage of self-regulation tools with before/after mood.

---

## Indexes

### Performance Indexes

```sql
CREATE INDEX idx_journals_user_date ON journals(user_id, date);
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_user_lineage ON habits(user_id, lineage_id);
CREATE UNIQUE INDEX idx_habit_completions_user_habit_date ON habit_completions(user_id, habit_id, date);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

---

## Data Integrity Rules

1. **Foreign Keys:** All `user_id` columns reference `users.id`
2. **Unique Constraints:** journals (user_id, date, session), habit_completions (user_id, habit_id, date), user_settings (user_id)
3. **CHECK Constraints:** journal session, habit category/timing, eisenhower quadrant, mood ranges
4. **Timestamps:** All tables track `created_at` for auditing
