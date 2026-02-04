# Data Model

> **Note:** This document describes both **existing tables** (currently implemented) and **planned tables** (for future enhancement). Planned items are marked accordingly.

## Overview

This document describes the database schema, relationships, and key design decisions.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │───────│  purchases  │       │  journals   │
│             │  1:N  │             │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
      │                                           │
      │ 1:N                                       │ N:1
      │                                           │
┌─────────────┐                             ┌─────────────┐
│   sessions  │                             │    users    │
└─────────────┘                             └─────────────┘
      
┌─────────────┐       ┌─────────────┐
│chat_messages│───────│    users    │
│             │  N:1  │             │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│export_history│──────│    users    │
│             │  N:1  │             │
└─────────────┘       └─────────────┘
```

---

## Tables

### users

Stores authenticated user information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR | PRIMARY KEY | Unique user identifier (from auth provider) |
| email | VARCHAR | | User's email address |
| first_name | VARCHAR | | First name |
| last_name | VARCHAR | | Last name |
| profile_image_url | VARCHAR | | Avatar URL |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | | Last update time |

**Notes:**
- ID comes from authentication provider (Replit Auth uses string IDs)
- User is upserted on each login to sync profile changes

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

### purchases

Tracks course purchases and access entitlements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL, FK → users | Purchaser |
| course_type | VARCHAR | NOT NULL, CHECK | 'course1', 'course2', or 'bundle' (constrained) |
| amount | INTEGER | NOT NULL | Price in cents |
| stripe_session_id | VARCHAR | UNIQUE | Stripe Checkout session ID |
| status | VARCHAR | DEFAULT 'completed' | Payment status |
| created_at | TIMESTAMP | DEFAULT NOW() | Purchase time |

**Notes:**
- `stripe_session_id` UNIQUE constraint enables idempotent webhook processing
- `course_type` CHECK constraint enforces valid values ('course1', 'course2', 'bundle')
- Bundle purchase grants access to both courses
- Amount stored in cents to avoid floating-point issues

### journals

Stores daily journal entries for Course 2.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL, FK → users | Entry author |
| date | DATE | NOT NULL | Entry date |
| session | VARCHAR | NOT NULL | 'morning' or 'evening' |
| gratitude | TEXT | | What I'm grateful for |
| intentions | TEXT | | Daily intentions |
| reflections | TEXT | | Reflections on the day |
| highlights | TEXT | | Day's highlights |
| challenges | TEXT | | Challenges faced |
| tomorrow_goals | TEXT | | Goals for tomorrow |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last edit time |

**Notes:**
- UNIQUE INDEX on (user_id, date, session) enforces one entry per user per date per session
- This constraint enables safe upsert operations
- Morning entries typically use: gratitude, intentions
- Evening entries typically use: highlights, reflections, challenges, tomorrow_goals

### chat_messages

Stores AI chat history for Course 1.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL, FK → users | Message author |
| role | VARCHAR | NOT NULL | 'user' or 'assistant' |
| content | TEXT | NOT NULL | Message content |
| created_at | TIMESTAMP | DEFAULT NOW() | Message time |

**Notes:**
- Messages ordered by `created_at` for conversation reconstruction
- Consider adding conversation_id if supporting multiple separate chats

### export_history *(Planned)*

Tracks export requests and generated files. **Not yet implemented.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | VARCHAR | NOT NULL, FK → users | Exporter |
| format | VARCHAR | NOT NULL | 'csv', 'txt', 'docx', 'pdf', 'json' |
| date_from | DATE | | Range start (null = all) |
| date_to | DATE | | Range end (null = all) |
| filename | VARCHAR | NOT NULL | Generated filename |
| file_size | INTEGER | | Size in bytes |
| entry_count | INTEGER | | Number of entries exported |
| created_at | TIMESTAMP | DEFAULT NOW() | Export time |

**Notes:**
- Enables re-download of previous exports
- Tracks usage patterns for analytics

---

## Indexes

### Performance Indexes

```sql
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_journals_user_date ON journals(user_id, date);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at);
CREATE INDEX idx_export_history_user ON export_history(user_id, created_at);
CREATE INDEX idx_sessions_expire ON sessions(expire);
```

---

## Type Definitions (Drizzle)

```typescript
// shared/schema.ts

import { pgTable, serial, varchar, text, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  email: varchar('email'),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  courseType: varchar('course_type').notNull(),
  amount: integer('amount').notNull(),
  stripeSessionId: varchar('stripe_session_id').unique(),
  status: varchar('status').default('completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const journals = pgTable('journals', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  date: date('date').notNull(),
  morningEntry: text('morning_entry'),
  eveningEntry: text('evening_entry'),
  mood: varchar('mood'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  role: varchar('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const exportHistory = pgTable('export_history', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  format: varchar('format').notNull(),
  dateFrom: date('date_from'),
  dateTo: date('date_to'),
  filename: varchar('filename').notNull(),
  fileSize: integer('file_size'),
  entryCount: integer('entry_count'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Insert schemas for validation
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertJournalSchema = createInsertSchema(journals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({ id: true, createdAt: true });

// Select types
export type User = typeof users.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Journal = typeof journals.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ExportHistory = typeof exportHistory.$inferSelect;
```

---

## Data Integrity Rules

1. **Foreign Keys:** All `user_id` columns reference `users.id`
2. **Unique Constraints:** `stripe_session_id` prevents duplicate purchases
3. **Required Fields:** `userId`, `courseType`, `amount` on purchases
4. **Soft Deletes:** Consider adding `deleted_at` for recoverable deletion
5. **Timestamps:** All tables track `created_at` for auditing
