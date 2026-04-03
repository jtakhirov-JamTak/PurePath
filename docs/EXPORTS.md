# Export System

## Current Implementation

Single endpoint exports all user data as a Markdown file.

```
GET /api/export-all
```

- **Format:** Markdown (`.md`)
- **Auth:** `isAuthenticated` + rate limited
- **Date range:** Exports all entries (no filtering)
- **Response:** File download with `Content-Disposition: attachment`

---

## Exported Sections

The export includes all user data, in this order:

1. **Identity Document** — identity statement, vision, values, purpose, strengths, patterns
2. **Monthly Goals** — goal statement, obstacles, IF-THEN plans per month
3. **Journal Entries** — morning/evening entries with structured content (parsed from JSON)
4. **Habits** — active and past habits with category, timing, cadence
5. **Habit Completion Log** — daily completions grouped by date with status icons (✓/½/✗)
6. **Weekly Planning (Eisenhower Matrix)** — tasks grouped by week and quadrant
7. **EQ Module (Empathy Exercises)** — prep and debrief exercises
8. **Trigger Logs** — trigger, emotion, urge, action taken, recovery
9. **Avoidance Logs** — what's being avoided, discomfort level, exposure step
10. **Tool Usage Logs** — tool name, before/after mood and emotion

---

## Output Format

```markdown
# Proof Arc — Complete Data Export
**User:** Jordan
**Exported:** 2026-03-22 14:30

---

## Identity Document

**Identity Statement:** I am someone who...
**Vision:** ...
**Values:** ...

---

## Monthly Goals

### 2026-03
**Goal:** ...
**Statement:** ...
**Inner Obstacle:** ...
**IF-THEN Plan 1:** ...

---

## Journal Entries

### 2026-03-22 — Morning

**Gratitude:** ...
**Intentions:** ...

---

## Habits

**Active Habits:**

- **Read 20 min** (self-development, morning, daily) — 20 min

### Habit Completion Log

**2026-03-22:**
  ✓ Read 20 min (completed)
  ✗ Exercise (skipped, reason: rain)

---

## Trigger Logs

### 2026-03-22 (morning)

**Trigger:** ...
**Emotion:** frustration (4/5)
**Urge:** withdraw (3/5)
**Action Taken:** ...

---

*Exported from Proof Arc on March 22, 2026.*
```

---

## Access Control

```typescript
app.get("/api/export-all", isAuthenticated, exportRateLimit, exportHandler);
```

Rate limited to prevent abuse (configured in `server/routes/helpers.ts`).

---

## Storage Strategy

**Current:** Generate on demand, no storage. Exports are created fresh each time.
