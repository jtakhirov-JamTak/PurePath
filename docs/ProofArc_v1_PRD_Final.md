# Proof Arc v1 — Final Product Requirements Document

**Version:** 3.0 (Final)
**Date:** April 9, 2026
**Status:** Approved — ready for implementation
**Codebase:** github.com/jtakhirov-JamTak/PurePath (main branch)
**Workshop SOT:** ProofArc_Workshop_Final.pptx (36 slides)

---

## 1. Product Principle

Proof Arc is one behavioral system across four time scales.

Me preserves the truth. Sprint commits it. Week translates it. Today proves it. Evidence refines it. Then the cycle repeats.

The closed loop:

Workshop Truth → Annual Commitment → Goal Sprint → Weekly Proof Plan → Daily Proof Move → Evidence → Sprint Review → Refined Commitment

The product thesis: what most people lack is not motivation — it is clarity. Proof Arc forces precision at every step. In v1, no Weekly Proof Behavior, Sprint behavior, or support habit enters the system without a structured pattern map. That is the moat.

---

## 2. Non-Negotiables

1. Navigation is exactly 4 tabs: Today / Week / Sprint / Me
2. Solo-first — no pods, no social features, no accountability network
3. Today is proof-first — the user always knows the one proof move for today
4. Week feels like 4 screens — richer logic exists under the hood
5. Sprint owns commitment adjustments — Week can flag issues, Sprint confirms refinements
6. Daily structured data is captured inside the existing journal flow — no extra screens
7. AI is not the source of truth — it may synthesize evidence, never invent values or patterns
8. Weekly Proof Behavior, Sprint behaviors, and support habits require completed pattern maps — success pattern and shadow pattern. The system may relax this for lightweight behaviors in future versions.
9. Precision is the gate — the precision wizard is required for all three behavior tiers in v1
10. Pattern Profile is a generated system layer — populated through commitment exercises, not manual form-filling

---

## 3. Naming System

| Old Name | New Name | Why |
|---|---|---|
| Monthly Goal | Goal Sprint | Cycles are 10-31 days, not strictly monthly |
| Weekly habit for the year | Weekly Proof Behavior | Precision. It is a proof behavior, not just a habit |
| Shadow habit | Shadow Pattern | It is a pattern, not a habit |
| Helping patterns | Success Patterns | Clearer, more motivating |
| Hurting patterns | Shadow Patterns | Consistent with shadow language |
| Repeating loop | Avoidance Loop | More precise |
| Trigger chain | Repeating Trigger Pattern | Distinguishes from one-off triggers |
| Monthly Goal tab | Sprint tab | Matches renamed object |

| Name | Status |
|---|---|
| Identity Document | Keep |
| Pattern Profile | Keep (generated, not manual) |
| Avoidance Loop | Keep |
| Repeating Trigger Pattern | Keep |
| Annual Commitment | Keep |
| Goal Sprint | New |
| Weekly Proof Behavior | New |

---

## 4. Navigation

### Tabs

| Tab | Route | Purpose |
|---|---|---|
| Today | `/today` | What does the person I am do today? |
| Week | `/week` | Turn self-knowledge into this week's proof |
| Sprint | `/sprint` | Is my commitment still real? |
| Me | `/me` | Preserve the workshop truth |

### Supporting routes

| Route | Purpose |
|---|---|
| `/today/journal/:date/:session` | Journal entry |
| `/week/plan` | Weekly planning ritual |
| `/setup` | Onboarding wizard |
| `/auth` | Authentication |
| `/admin` | Admin panel |

### Redirects (backward compatibility)

| Old Route | Redirects To |
|---|---|
| `/dashboard` | `/today` |
| `/plan` | `/week` |
| `/eisenhower` | `/week/plan` |
| `/profile` | `/me` |
| `/identity` | `/me` |
| `/pattern-profile` | `/me` |
| `/scoreboard` | `/sprint` |
| `/monthly-goal` | `/sprint` |
| `/journal` | `/today` |
| `/habits` | `/me` |
| `/month` | `/sprint` |

### Routes removed as standalone destinations

| Route | Merged Into |
|---|---|
| `/profile` | Me tab |
| `/identity` | Me tab |
| `/pattern-profile` | Me tab |
| `/scoreboard` | Sprint tab |
| `/monthly-goal` | Sprint tab |
| `/habits` | Me tab |
| `/journal` (hub) | Today tab |

---

## 5. The Precision Wizard

The most important UX pattern in the product. Reused across onboarding, annual commitment, Goal Sprint, and support habit creation. Every behavior that enters the system passes through this wizard.

### What it produces

For every recurring behavior, two structured patterns:

**Success Pattern (light):**

| Field | Prompt | Required |
|---|---|---|
| When | "When [context/trigger]..." | Yes |
| I do | "I [specific positive behavior]..." | Yes |
| Outcome | "The outcome is [positive result]" | Yes |
| Impact | "Others experience [impact]" | Optional — only when interpersonal |

**Shadow Pattern (dark) — emotion-first mapping:**

| Step | Prompt | Format |
|---|---|---|
| 1. Emotions | "When you're at your worst around this, what do you feel?" | Chip selection (1-3): anxiety, shame, frustration, overwhelm, apathy, resentment, fear, numbness |
| 2. Environment | "For those emotions to show up, what has to have happened? What activity, situation, or environment creates that state?" | Free text, specific |
| 3. Behavior | "When you're in that state, what do you actually do?" | Free text |
| 4. Outcome | "What happens as a result?" | Free text |

### Design rules

- Always map success pattern first, then shadow. Light before dark.
- The precision wizard is the gate. No behavior enters without completing both patterns.
- Shadow pattern emotion chips are stored as structured data for analytics.
- "Impact on others" is optional on the success pattern — solo behaviors (meditation, saving money) don't need it.

### Where it fires

| Context | Creates |
|---|---|
| Annual Commitment (onboarding Step 2) | Weekly Proof Behavior + Success Pattern 1 + Shadow Pattern 1 |
| Best-State Calibration (onboarding Step 3) | Success Pattern 2 + optional Shadow Pattern 2 |
| Goal Sprint creation (every sprint) | Sprint support behavior + patterns |
| Support habit creation (Me tab) | Support habit + patterns |

---

## 6. Onboarding

Workshop-first onboarding. The user has completed the Proof Arc workshop and is logging in for the first time.

### Step 1 — Core Identity

Three things only. This is the foundation.

**Values (3 total):**
- 2 core values (already present in how you live)
- 1 aspirational value (who you want to grow into)
- For each: "I value [X] because [why]"
- The why is the most important part (workshop slide 10)

**Identity statement:**
- Written in present tense: "I am [X, Y, Z]"
- The user speaks as if they already are this person
- Plus: "Why it matters: [explanation]"

**Vision:**
- "My vision is [2-3 sentences]" — specific, five-year, concrete
- "Why it matters: [explanation]" — separate text box

**Saves to:**
- `identity_documents` (editable current profile)
- `workshop_seed` (immutable snapshot, created at end of onboarding)

---

### Step 2 — Annual Commitment

The 1-Year Commitment exercise (workshop slides 29-35).

**2a. Domain selection:**
- "If you could create unmistakable proof in only one domain over the next year, which one?"
- Health / Wealth / Relationships / Growth / Joy

**2b. Visualization:**
- Close your eyes. One year from now.
- Morning: what do you do automatically that used to require effort?
- Midday: a hard moment happens — how do you handle it?
- Evening: what did you follow through on that the old you would have avoided?
- Freeze frame: what single moment captures the transformation?
- Write the scene.

**2c. Scoreboard:**
- "In 12 months, I am the kind of person who ___"
- Observable proof point (others can verify): ___
- Success metric (precise number): ___

**2d. Weekly Proof Behavior:**
- "One primary proof behavior I will do every week: ___"
- User selects schedule (which days), cadence (weekly), and category
- **→ Precision wizard fires:**
  - Map Success Pattern (when/I do/outcome/optional impact)
  - Map Shadow Pattern (emotions → environment → behavior → outcome)
- Saved as a yearly recurring behavior in Habits table (source: "annual", end date: Dec 31)
- Success Pattern → `patternProfiles` Success Pattern 1
- Shadow Pattern → `patternProfiles` Shadow Pattern 1

**2e. Confidence check:**
- "How confident are you, 0-10, that you can sustain this weekly for 4 weeks?"
- If below 8: prompt to shrink it (workshop slide 31)

**2f. Obstacle identification:**
- "Now picture the exact moment that prevents this. What inside you is most likely to block it?"
- Free text, one sentence

**2g. Face the truth (Avoidance Loop):**
Workshop slide 25:
- The story I keep telling myself is ___
- What this story helps me avoid is ___
- The cost of keeping it is ___
- The commitment I make is ___
- The specific behavior that would prove it is ___

Saves to: `patternProfiles` Avoidance Loop fields (repeatingLoopStory, repeatingLoopAvoidance, repeatingLoopCost)

**2h. Map the trigger (Repeating Trigger Pattern):**
Workshop slide 21:
- When [trigger/obstacle] happens
- The story I tell myself is ___
- I feel [emotion]
- I feel the urge to [urge]
- I do [behavior]
- The outcome is ___

Saves to: `patternProfiles` Repeating Trigger Pattern fields

**2i. Build IF-THEN plans:**
Workshop slide 32:
- IF [specific trigger from 2h] THEN [small immediate action]
- IF [specific trigger from 2h] THEN [small immediate action]
- THEN actions must be small enough to do while stressed

**Saves to:**
- `annual_commitments` (domain, personStatement, proofPoint, proofMetric, visualization, weeklyProofBehaviorHabitId, ifThenPlan1, ifThenPlan2, confidenceCheck)
- `habits` (Weekly Proof Behavior with source="annual")
- `patternProfiles` (Success Pattern 1, Shadow Pattern 1, Avoidance Loop, Repeating Trigger Pattern)

---

### Step 3 — Best-State Calibration

One-time calibration exercise. Never repeated after initial setup.

**3a. Examples at your best:**
- "Write 3 scenarios: when I'm at my best, [this outcome] happens"
- Three structured entries

**3b. Best-state emotions:**
- "What 1-3 emotions are you feeling when you're at your best?"
- Chip selection from emotion set

**3c. Best-state environment:**
- "What specific behaviors, environments, or situations create those emotions?"
- 3 entries, specific and concrete

**3d. Success Pattern 2:**
- "Based on what you just wrote, what is the one behavior that keeps you at your best?"
- **→ Precision wizard fires (success pattern only)**
- Saves to: `patternProfiles` Success Pattern 2

**3e. Shadow Pattern 2 (optional):**
- "Is there a clear opposite — a behavior that pulls you out of your best state?"
- If yes → Precision wizard fires (shadow pattern only)
- Saves to: `patternProfiles` Shadow Pattern 2
- If not clearly present, skip — the annual commitment already created Shadow Pattern 1

**Implementation note:** Best-State Calibration is coherent but sizable. Instrument dropoff at each sub-step (3a through 3e) and be ready to collapse if completion rates fall below acceptable thresholds after the first cohort. Do not preemptively cut — let the data decide.

---

### Step 4 — First Goal Sprint

User creates their first sprint:

- Sprint name / commitment goal
- Cycle length: 10-31 days (user selects start and end date)
- Associated support behavior (if relevant) → precision wizard fires
- Confidence check

---

### Step 5 — First Weekly Plan

Run the 4-screen weekly planning ritual. Review screen is skipped for week 1 (no prior week to close).

---

### Step 6 — First Morning Proof

Complete first morning journal:
- See rotating value + why
- Write one proof move
- Write intention

**At completion of all steps:**
- Finalize `workshop_seed` with all generated data
- Mark onboarding complete

---

## 7. Core System Objects

### 7.1 workshop_seed

| Attribute | Value |
|---|---|
| Purpose | Immutable source snapshot of original workshop truth |
| Visibility | Not surfaced in UI in v1 — engineering provenance and AI grounding only |
| Created | Once, at end of onboarding |
| Editable | Never |

**Fields:**

```
id, userId, source ("workshop")
identityStatement, valuesJson, vision, purpose
successPatternsJson, shadowPatternsJson
triggerPatternJson, avoidanceLoopJson, blindSpotsJson
acceptanceTruth, bestStateCalibrationJson
createdAt
```

---

### 7.2 identity_documents (modified)

| Attribute | Value |
|---|---|
| Purpose | Editable current profile — foundational identity |
| Owns | Identity, values + why, vision + why, purpose, acceptance truth |

**Add field:**
```
acceptanceTruth: text default ""
```

**Deprecate fields (stop reading/writing, keep columns):**
```
todayValue — moved to journal structured fields
todayIntention — moved to journal structured fields
todayReflection — moved to journal structured fields
yearVision — moved to annual_commitments
yearVisualization — moved to annual_commitments
visionDomain — moved to annual_commitments
othersWillSee — no longer needed
```

**Files currently reading deprecated fields that must be updated:**
- `client/src/pages/dashboard.tsx` (lines 333-341)
- `client/src/pages/scoreboard.tsx` (lines 63-64)
- `client/src/pages/journal-entry.tsx` (lines 229-240)
- `server/routes/identity.ts`

---

### 7.3 pattern_profiles (modified)

| Attribute | Value |
|---|---|
| Purpose | Structured behavioral patterns — generated through exercises, not manual entry |
| Population | Automatic via Annual Commitment and Best-State Calibration flows |
| Editable | Yes, in Me tab after generation |

**Renamed sections:**

| DB Field Prefix | Display Name |
|---|---|
| helpingPattern[1-3] | Success Pattern [1-3] |
| hurtingPattern[1-3] | Shadow Pattern [1-3] |
| repeatingLoop | Avoidance Loop |
| triggerPattern | Repeating Trigger Pattern |
| blindSpot[1-3] | Blind Spots |

**Add fields:**
```
hurtingPattern1Emotions: varchar — comma-separated emotion chips
hurtingPattern1Environment: text — situation/environment that creates state
hurtingPattern2Emotions: varchar
hurtingPattern2Environment: text
hurtingPattern3Emotions: varchar
hurtingPattern3Environment: text
bestStateEmotions: varchar — 1-3 emotion chips from calibration
bestStateEnvironments: text — environments/behaviors from calibration
bestStateExamplesJson: text — 3 best-state scenarios as JSON
```

**Population map:**

| Pattern Profile Field | Populated By |
|---|---|
| Success Pattern 1 | Annual Commitment → Weekly Proof Behavior precision wizard |
| Shadow Pattern 1 | Annual Commitment → Shadow precision wizard |
| Success Pattern 2 | Best-State Calibration |
| Shadow Pattern 2 | Best-State Calibration (optional) |
| Success Pattern 3 | Available for user to add later in Me |
| Shadow Pattern 3 | Available for user to add later in Me |
| Avoidance Loop | Annual Commitment → obstacle exercise |
| Repeating Trigger Pattern | Annual Commitment → trigger mapping |
| Blind Spots 1-3 | User-populated in Me, or through future exercises |
| Best-state data | Best-State Calibration (one-time) |

---

### 7.4 annual_commitments (NEW)

| Attribute | Value |
|---|---|
| Purpose | One active annual transformation target |
| Separated from | monthly_goals and identity_documents |

**Fields:**
```
id: serial primary key
userId: varchar not null
domain: varchar(50) — health/wealth/relationships/growth/joy
personStatement: text — "I am the kind of person who ___"
proofPoint: text — observable, verifiable
proofMetric: text — precise number
visualization: text — the scene from the visualization exercise
weeklyProofBehaviorHabitId: integer nullable — FK to habits table (source="annual")
ifThenPlan1: text — IF-THEN plan for obstacle
ifThenPlan2: text — IF-THEN plan for obstacle
confidenceCheck: integer — 0-10 confidence score
isActive: boolean default true
createdAt: timestamp
updatedAt: timestamp
```

**Rules:**
- Only one active annual commitment at a time
- Goal Sprint planning derives from this
- Weekly Proof Behavior is a habit row (source="annual") referenced by `weeklyProofBehaviorHabitId`
- IF-THEN plans and confidence live here because they protect the annual behavior
- Sprint references the active annual commitment but does not own the weekly behavior

**Migration:** Extract from existing `monthly_goals` (proofMetric, successProof) and `identity_documents` (visionDomain, yearVision). Create one row per user with isActive: true.

---

### 7.5 goal_sprints (replaces monthly_goals)

| Attribute | Value |
|---|---|
| Purpose | Active commitment cycle (10-31 days) |
| Renamed from | monthly_goals |

**Keep existing fields (rename table or alias):**
```
goalStatement, goalWhat, goalWhen, goalWhere, goalHow
ifThenPlan1, ifThenPlan2 — sprint-specific IF-THEN plans (may differ from annual IF-THENs)
confidenceCheck — sprint-level confidence
innerObstacle, obstacleTrigger, obstacleThought, obstacleEmotion, obstacleBehavior
nextConcreteStep
```

**Note:** Weekly Proof Behavior is NOT stored here. Sprint references the active annual commitment's linked habit via `annual_commitments.weeklyProofBehaviorHabitId`.

**Add fields:**
```
sprintName: varchar(200) — user-facing name for this sprint
startDate: date not null — sprint start
endDate: date not null — sprint end (10-31 days from start)
needsSprintReview: boolean default false
needsSprintReviewReason: text nullable
sprintStatus: varchar(20) default "active" — active/completed/archived
closedAs: varchar(20) nullable — end/carry_forward/promote_to_habit
carryForwardCount: integer default 0 — max 1 carry forward allowed
```

**Remove dependency on monthKey:** Replace `monthKey` with explicit `startDate`/`endDate`. Duration derived from date range.

**Cycle close rules:**

Every Goal Sprint must end in one of 3 states:

| Close State | Behavior |
|---|---|
| End | Sprint marked completed. Associated sprint behavior archived. |
| Carry Forward | Sprint extends for one additional cycle (same duration). carryForwardCount incremented. Max 1 carry forward — after that, must End or Promote. |
| Promote to Support Habit | Sprint behavior becomes a permanent support habit in the habits table (source="support"). Sprint marked completed. |

**Auto-trigger rules for needsSprintReview:**
1. User manually flags from Week tab
2. confidenceCheck < 7
3. Weekly Proof Behavior is edited mid-year (via annual commitment)
4. Handle completion rate < 50% for 2 consecutive weeks
5. Same shadow pattern or skip reason appears 3+ times in 14 days

---

### 7.6 habits (modified)

| Attribute | Value |
|---|---|
| Purpose | All recurring behaviors — annual, sprint, and support |

**Add fields:**
```
source: varchar(20) — "annual" / "sprint" / "support"
isPinned: boolean default false
sprintId: integer nullable — links sprint behaviors to their Goal Sprint
proofPatternWhen: text
proofPatternBehavior: text
proofPatternOutcome: text
proofPatternImpact: text nullable — optional, only for interpersonal behaviors
shadowEmotions: varchar — comma-separated emotion chips
shadowEnvironment: text
shadowBehavior: text
shadowOutcome: text
```

**Three tiers:**

| Tier | Source | Cadence | Lifespan | Precision Required |
|---|---|---|---|---|
| Weekly Proof Behavior | Annual Commitment | Weekly (user selects days) | Calendar year | Yes — success + shadow |
| Sprint Behavior | Goal Sprint | Flexible (user selects) | Duration of sprint, then archived | Yes — success + shadow |
| Support Habit | User-created in Me | Flexible | Until archived | Yes — success + shadow |

**Behavior rules:**
- source="annual": One behavior, weekly, locked for the year. Created during onboarding Step 2. Only changes if Sprint review explicitly revises it.
- source="sprint": One behavior per sprint, flexible cadence. Created during Goal Sprint setup. When sprint ends: archived (active: false) if closed as End; promoted to source="support" if closed as Promote; extended if Carry Forward.
- source="support": Up to 3 pinned in Today lane. Created in Me tab anytime.
- All three tiers require completed success + shadow patterns via precision wizard.

**Migration for existing users:**
- Auto-pin top 3 habits by completion frequency
- All others set isPinned: false
- Existing habits get source="support" as default

---

### 7.7 journals (modified)

| Attribute | Value |
|---|---|
| Purpose | Daily proof capture embedded in existing journal flow |

**Add fields:**
```
selectedValueKey: varchar(50) nullable
selectedValueLabel: text nullable
selectedValueWhySnapshot: text nullable
proofMove: text nullable
proofMoveCompleted: boolean nullable
helpingPatternKey: varchar(100) nullable — renamed display: "success pattern"
hurtingPatternKey: varchar(100) nullable — renamed display: "shadow pattern"
triggerOccurred: boolean default false
stuckToolUsed: varchar(30) nullable — trigger/containment/fear/avoidance
shadowEmotionFlags: varchar nullable — emotions matching shadow pattern
```

**Morning journal saves:**
- selectedValueKey, selectedValueLabel, selectedValueWhySnapshot
- proofMove
- intentions (existing)

**Evening journal saves:**
- proofMoveCompleted (yes/no)
- helpingPatternKey (optional select: 0-1 from success patterns)
- hurtingPatternKey (optional select: 0-1 from shadow patterns)
- triggerOccurred (yes/no — if yes, offer trigger exercise)
- shadowEmotionFlags (if user selects emotions matching their shadow)
- reflections (existing)

**Design rule:** Structured fields feel like natural parts of the reflection, not a separate form. Pattern selectors are optional.

---

### 7.8 eisenhower_entries (modified)

**Add field:**
```
proofBucket: varchar(20) nullable — "handle" / "protect" / "not_this_week"
```

Keep existing `quadrant` field for backward compatibility. New UI writes `proofBucket` as primary. Mapping: q1→handle, q2→protect, q4→not_this_week.

**Caps:**
- Handle: max 5
- Protect: max 2
- Not This Week: unlimited

---

### 7.9 weekly_summaries (modified)

**Add fields:**
```
flaggedForSprintReview: boolean default false
flaggedForSprintReviewReason: text nullable
```

---

### 7.10 Evidence layer (keep existing, no changes)

| Table | Purpose |
|---|---|
| trigger_logs | Trigger exercise outputs |
| fear_logs | FaceTheFear outputs |
| avoidance_logs | Avoidance exercise outputs |
| containment_logs | Containment exercise outputs |
| habit_completions | Daily habit check-offs |
| tool_usage_logs | Tool usage tracking |

These power evidence and suggestions. They remain separate tables even though the front-end entry point is unified through "I'm stuck."

---

## 8. Tab Specifications

### 8.1 TODAY

**Purpose:** What does the person I am do today?

#### Top section (always visible, in this order)

**1. Identity anchor**
- "I am [identity statement]"
- Source: `identity_documents.identity`

**2. This week's proof behavior**
- Source: `annual_commitments.weeklyProofBehaviorHabitId` → linked habit row
- One-line display

**3. Today's proof move — dominant CTA**
- Source: morning journal `proofMove` for today
- If not yet set: prompt to complete morning journal
- If set: show with completion toggle

#### Main body — single interleaved timeline

| Item | Source |
|---|---|
| Morning journal | journals (session="morning") |
| Weekly Proof Behavior | habits (source="annual") |
| Sprint Behavior | habits (source="sprint", current sprint) |
| Focus items | eisenhower_entries (proofBucket="handle", scheduled today) |
| Pinned support habits (max 3) | habits (source="support", isPinned=true) |
| Evening journal | journals (session="evening") |
| Other routines (collapsed) | habits (source="support", isPinned=false) |

#### Morning journal

Show:
- Identity statement
- One rotating value + its why (cycle daily through 3 values)
- "What is the one proof move today?" → saves to `journals.proofMove`
- Optional intention field

Value rotation: `dayOfYear % values.length` determines which value to show.

#### Evening journal

Ask:
- "Where did I act like the person I am?" → free text
- "Where did the old pattern show up?" → free text
- "Did I complete my proof move?" → yes/no → `journals.proofMoveCompleted`
- "Which success pattern showed up?" → optional select from success patterns → `journals.helpingPatternKey`
- "Which shadow pattern showed up?" → optional select from shadow patterns → `journals.hurtingPatternKey`
- "Did a trigger happen?" → yes/no → `journals.triggerOccurred`. If yes, offer trigger exercise.

#### "I'm stuck" — single entry point

One button. No tool menu.

**Context-aware auto-routing:**

| Context | Routes To |
|---|---|
| Launched from skipped Handle/Protect item | Avoidance exercise |
| Launched near a trigger log or after trigger indicated | Trigger exercise |
| User appears emotionally flooded | Containment |
| Context matches fear pattern | FaceTheFear |

**Fallback micro-decision tree (no context):**

Screen 1: "Are you flooded or stalled?"
- Flooded → Containment (default if no response in 5 seconds)
- Stalled → Screen 2

Screen 2: "What fits best right now?"
- "Something set me off" → Trigger exercise
- "I know what to do but I'm afraid" → FaceTheFear
- "I keep putting it off" → Avoidance exercise

All tools save to their existing log tables.

#### Habit display rules

| Tier | Visibility |
|---|---|
| Weekly Proof Behavior (annual) | Always visible, prominent |
| Sprint Behavior (sprint) | Always visible, visually distinct from annual |
| Pinned support habits | Max 3 in main lane |
| Other support habits | Collapsed "Other routines" section |

No hard cap on total habits in database — cap is on visible focus only.

---

### 8.2 WEEK

**Purpose:** Turn self-knowledge into this week's proof.

Two states: Planning Ritual and Execution Board.

#### Planning Ritual (`/week/plan`)

4 visible screens. Internal 8-step logic preserved underneath.

**Screen 1 — Review**

- Show Weekly Proof Behavior: "Your proof behavior: [behavior]. Did you do it?"
- Show completed/total weekly items + habits
- Show skip reasons cross-referenced with shadow patterns
- Show Avoidance Loop story as faded reference: "In the workshop, you identified this story: [avoidanceLoopStory]"

**Screen 2 — Choose Truth**

- "What story did I tell myself last week when I avoided what mattered?"
- "What hard truth is that story helping me avoid — and what is it costing me?"
- "What hard action will I take this week that proves I accepted that truth?"

**Screen 3 — Build Week**

- Brain dump — everything on your mind
- Convert to this-week outcomes — vague items become concrete. Optional: tag up to 2 items tied to hard truth/hard action. Delete items that don't survive conversion.
- Classify each candidate — 3 questions:

**Question 1 — Does this materially move a goal or key responsibility?**
- Yes, this clearly deserves space this week
- No, not this week

**Question 2 — If I ignore this for 7 days, what happens?**
- A deadline or appointment breaks
- Another important task is blocked
- Cost or risk gets worse
- It's consuming mental energy disproportionate to its size
- Not much happens

**Question 3 — What's the real reason this isn't already happening?**
- I'm avoiding it because it feels uncomfortable → offer FaceTheFear
- I'm not clear on the next step
- I need something from someone else
- Nothing is in the way

- Bucket and cap: Handle (5) / Protect (2) / Not This Week (rest)
- Pattern-map nudge fires after bucketing: AI checks items against shadow patterns, avoidance loop, blind spots, hard action. If no chosen item addresses a known avoidance pattern: "You tend to avoid [pattern]. Is there something you're leaving out?" — Add it / Already covered / Not this week. Log dismissals.

**Screen 4 — Protect Week**

For Handle items:
- First proof move (required)
- Time block (required)
- Pre-suggest IF-THEN from active Goal Sprint's `ifThenPlan1` and `ifThenPlan2`

For Protect items:
- Protected time block
- First proof move
- "When [trigger], I will [action]"

For Not This Week items:
- Revisit date or "next Sunday"

Nothing leaves without a trigger attached.

Sequence logic within Handle (visible to user, draggable):
1. Dependency — unblocks other items
2. Hard deadline / appointment
3. Consequence severity
4. Strategic leverage — small effort, disproportionate payoff

#### Execution Board (`/week`)

Default screen after plan is committed.

- Weekly Proof Behavior at top (always visible)
- Handle section with completion toggles and skip reasons
- Protect section with completion toggles
- Not This Week (collapsed)
- "Flag for sprint review" action → sets `needsSprintReview`

---

### 8.3 SPRINT

**Purpose:** Is the commitment still real?

This tab owns refinement.

#### Header

- Annual domain (from `annual_commitments`)
- Person statement
- Proof metric
- Current Goal Sprint name + remaining days

#### Active sprint view (default)

- Weekly Proof Behavior
- Sprint behavior with success + shadow patterns
- Completion dots: one per week of the sprint
- Current confidence score
- IF-THEN plans
- Sprint review flag banner if `needsSprintReview === true`

#### Sprint Ritual (fires at sprint close)

Three parts.

**Part 1 — Close Sprint**

| Metric | Source |
|---|---|
| Sprint behavior completion rate | habit_completions for sprint behavior |
| Weekly Proof Behavior completion rate | habit_completions for annual behavior |
| Proof moves intended vs completed | journals.proofMove vs proofMoveCompleted |
| Shadow pattern frequency | journals.hurtingPatternKey across sprint |
| Success pattern frequency | journals.helpingPatternKey across sprint |

Important: these analytics depend on structured journal fields. Do not pretend to have clean analytics without structured capture.

**Part 2 — Values Check**

- Show all 3 values + why
- "Which value did you live most this sprint?"
- "Which value did you neglect?"
- App pre-suggests based on `journals.selectedValueKey` frequency

**Part 3 — Refresh + New Sprint**

Close current sprint (required):
- Select close state: End / Carry Forward / Promote to Support Habit
- If Carry Forward: carryForwardCount incremented. If already 1, Carry Forward is disabled — must End or Promote.

Commitment refresh:
- Re-ask confidence 0-10
- If < 8: suggest shrinking Weekly Proof Behavior
- Revise IF-THEN plans if needed
- Show acceptance truth: "The truth you said you'd been avoiding: [acceptanceTruth]. Is this still true?"
- Process any active `needsSprintReview` flag

New sprint:
- Sprint name / commitment goal
- Cycle length: 10-31 days
- New sprint support behavior → precision wizard fires (success + shadow pattern)
- Confidence check

---

### 8.4 ME

**Purpose:** Preserve the workshop truth.

Foundation screen, not a junk drawer.

#### Primary sections (workshop foundation)

Each section is a collapsible card. Tap to expand and edit.

| # | Section | Source |
|---|---|---|
| 1 | Identity statement (present tense) | identity_documents.identity |
| 2 | Values + why (2 core + 1 aspirational) | identity_documents.values |
| 3 | Vision + why (5-year) | identity_documents.vision |
| 4 | Purpose | identity_documents.purpose |
| 5 | Success Patterns (up to 3) | pattern_profiles.helpingPattern* |
| 6 | Shadow Patterns (up to 3, with emotions + environment) | pattern_profiles.hurtingPattern* |
| 7 | Repeating Trigger Pattern | pattern_profiles.triggerPattern* |
| 8 | Avoidance Loop (story / avoidance / cost) | pattern_profiles.repeatingLoop* |
| 9 | Blind Spots (up to 3) | pattern_profiles.blindSpot* |
| 10 | Acceptance Truth | identity_documents.acceptanceTruth |
| 11 | Annual Commitment summary | annual_commitments |

#### Secondary sections

| # | Section |
|---|---|
| 12 | Habits — create, edit, archive, pin/unpin. All new habits go through precision wizard. |
| 13 | Account settings |
| 14 | Data export |

---

## 9. Data Flow — Single Source, Single Reference, Single Cadence

| Data | Stored In | Edited In | Referenced In | Cadence |
|---|---|---|---|---|
| Identity statement | identity_documents | Me | Today anchor, Morning journal | Daily |
| Values + why | identity_documents | Me | Morning journal (1 rotating) | Daily |
| Success patterns | pattern_profiles + habits | Me | Evening journal | Daily |
| Shadow patterns | pattern_profiles + habits | Me | Evening journal, Week close, AI nudge | Daily + Weekly |
| Shadow emotions | pattern_profiles + habits | Me | Evening journal emotion tracking | Daily |
| Weekly Proof Behavior | annual_commitments → habits (source="annual") | Sprint (revision only) | Week tab (always visible), Week Screen 1 | Weekly |
| Avoidance Loop story | pattern_profiles | Me | Week Screen 2 (faded reference) | Weekly |
| Repeating Trigger Pattern | pattern_profiles | Me | Week Screen 1 (cross-ref with logs) | Weekly |
| IF-THEN plans (annual) | annual_commitments | Sprint (revision) | Week Screen 4 (pre-suggested) | Weekly |
| IF-THEN plans (sprint) | goal_sprints | Sprint | Week Screen 4 (pre-suggested) | Weekly |
| Annual domain + metric | annual_commitments | Sprint | Sprint header | Per sprint |
| All 3 values | identity_documents | Me | Sprint values check | Per sprint |
| Vision + purpose | identity_documents | Me | Sprint refresh | Per sprint |
| Acceptance truth | identity_documents | Me | Sprint reflection | Per sprint |
| Confidence (annual) | annual_commitments | Sprint (revision) | Sprint re-check | Per sprint |
| Confidence (sprint) | goal_sprints | Sprint | Sprint re-check | Per sprint |
| Blind spots | pattern_profiles | Me | Sprint reflection, AI nudge | Per sprint |

---

## 10. Longitudinal Data (silent, feeds AI and insights)

| Source | Table | Surfaced As |
|---|---|---|
| Trigger logs | trigger_logs | Week cross-reference, Sprint pattern frequency |
| Fear logs | fear_logs | Sprint shadow count |
| Avoidance logs | avoidance_logs | AI nudge context |
| Containment logs | containment_logs | AI nudge context |
| Weekly skip reasons | eisenhower_entries.skipReason | Week close, Sprint completion data |
| Pattern nudge dismissals | eisenhower_entries | "Deferred [pattern] X of last Y weeks" |
| Evening success pattern picks | journals.helpingPatternKey | Sprint success frequency |
| Evening shadow pattern picks | journals.hurtingPatternKey | Sprint shadow frequency |
| Shadow emotions | journals.shadowEmotionFlags | Emotion-to-environment analysis |
| Value selection frequency | journals.selectedValueKey | Sprint values check pre-suggestion |
| Proof move completion | journals.proofMoveCompleted | Sprint proof moves intended vs completed |
| Sprint behavior history | habit_completions + archived habits | Sprint close analytics |
| Confidence trend | annual_commitments + goal_sprints | Quarterly insight |

---

## 11. Classification Logic (Weekly Proof Engine)

**Preserved from current codebase** (`proof-engine-logic.ts`), with updates:

**Classification function:**

| Condition | Result |
|---|---|
| consequence = deadline_breaks OR task_blocked OR cost_worse | Handle |
| goal = "clearly" AND consequence = important_nothing_breaks AND blocker = nothing | Handle |
| goal = "no" | Not This Week |
| consequence = "not_much" | Not This Week |
| goal = "clearly" | Protect |
| Otherwise | Not This Week |

**Question 1 options (binary — "somewhat" removed):**
- Yes, this clearly deserves space this week
- No, not this week

**Question 2 options:**
- A deadline or appointment breaks
- Another important task is blocked
- Cost or risk gets worse
- It's consuming mental energy disproportionate to its size
- Not much happens

**Question 3 options:**
- I'm avoiding it because it feels uncomfortable → trigger FaceTheFear
- I'm not clear on the next step
- I need something from someone else
- Nothing is in the way

---

## 12. AI Rules

**AI may:**
- Summarize evidence
- Surface trends
- Suggest revisions
- Suggest tool routing ("I'm stuck")
- Suggest IF-THEN refinements
- Detect emotion-to-environment patterns from shadow data

**AI may not:**
- Invent values
- Invent identity
- Overwrite workshop truth
- Claim certainty without evidence

**Grounding sources (in order of authority):**
1. workshop_seed
2. identity_documents
3. pattern_profiles
4. annual_commitments
5. goal_sprints
6. weekly_summaries
7. journals
8. logs

**Valid AI phrasing:**
- "Based on your last 3 trigger logs..."
- "Based on your missed proof moves this sprint..."
- "The shadow emotion you flagged most was [X], usually in [environment]..."

---

## 13. Server Routes

### New endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | /api/workshop-seed | Create immutable snapshot |
| GET | /api/workshop-seed | Read (AI use only) |
| GET | /api/annual-commitment | Get active commitment |
| POST | /api/annual-commitment | Create commitment |
| PUT | /api/annual-commitment/:id | Update commitment |
| GET | /api/goal-sprint | Get active sprint |
| POST | /api/goal-sprint | Create sprint |
| PUT | /api/goal-sprint/:id | Update sprint |
| POST | /api/goal-sprint/:id/close | Close sprint with state |
| PATCH | /api/goal-sprint/flag-review | Set needsSprintReview |
| GET | /api/sprint/summary/:sprintId | Sprint analytics aggregation |
| POST | /api/sprint/ritual-complete | Mark ritual done, clear flags |

### Modified endpoints

| Method | Path | Change |
|---|---|---|
| PUT | /api/identity-document | Add acceptanceTruth, stop writing deprecated fields |
| POST | /api/journals | Accept new structured fields |
| PUT | /api/journals/:id | Accept new structured fields |
| POST | /api/eisenhower/commit-week | Write proofBucket, run needsSprintReview triggers |
| POST | /api/habits | Accept precision wizard fields |
| PUT | /api/habits/:id | Accept precision wizard fields |

---

## 14. Build Order

### Phase 1 — Today (ship first)

- `/today` with proof-first layout
- Structured morning/evening journal fields
- "I'm stuck" router
- Pinned habit display (3 max in main lane)
- Value rotation with why
- Redirect `/dashboard` → `/today`

**Success:** Users create a proof move daily, close the day, use "I'm stuck" when blocked.

### Phase 2 — Week

- `/week` execution board with proofBucket
- `/week/plan` 4-screen planning ritual
- Weekly Proof Behavior display
- Flag-for-review mechanism
- Pattern nudge + FaceTheFear trigger from classification
- Redirects for `/eisenhower` and `/plan`

**Success:** Users create weekly plans and complete Handle items.

### Phase 3 — Sprint

- `/sprint` with active view + sprint ritual
- `annual_commitments` table
- `goal_sprints` table (replaces monthly_goals)
- Sprint close states (end/carry forward/promote)
- Sprint analytics from structured journal data
- needsSprintReview auto-triggers
- Precision wizard for sprint behaviors
- Redirects for `/scoreboard` and `/monthly-goal`

**Success:** Users close sprints, create new ones through precision wizard, refine commitments.

### Phase 4 — Me + Onboarding

- `/me` consolidating workshop foundation
- `workshop_seed` table
- New 6-step onboarding wizard
- Precision wizard as reusable component
- Habit management with source tiers
- Best-State Calibration as one-time exercise
- Redirects for `/profile`, `/identity`, `/pattern-profile`

**Success:** All habits have success + shadow patterns. Onboarding flows from workshop.

### Phase 5 — Evidence Intelligence

- AI suggestions from structured logs
- Pattern detection from shadow emotion data
- IF-THEN refinement suggestions
- Emotion-to-environment analysis
- Longitudinal deferral tracking

---

## 15. Migration Safety Rules

1. Never delete columns — mark deprecated, stop reading/writing
2. Add new columns with safe defaults — all nullable or explicit defaults
3. Dual-write during transition — write both quadrant and proofBucket
4. Backfill at migration — generate workshop_seed and annual_commitments from existing data
5. Keep redirects permanent — old URLs always resolve
6. Feature-flag phase rollout — each phase ships independently
7. Archive sprint behaviors on close — never delete, set active: false
8. Rename table gradually — goal_sprints can alias monthly_goals initially

---

## 16. Acceptance Test

A user who attended the Proof Arc workshop can:

1. Complete onboarding by entering core identity (values/identity/vision), making their annual commitment with a precision-mapped Weekly Proof Behavior and shadow pattern, completing Best-State Calibration, and creating their first Goal Sprint

2. Open the app any day and instantly see who they are, this week's proof behavior, and today's one proof move

3. Complete a morning journal in under 2 minutes with a rotating value + why and one proof move

4. Get help through one "I'm stuck" entry without choosing from a confusing tool menu

5. Plan their week in 4 clear screens that surface what pulled them back, what truth they're avoiding, and what this week's proof is

6. Close a Goal Sprint, see real pattern data, create a new sprint with a new behavior through the precision wizard, and refine the commitment — or carry forward once, or promote to a permanent support habit

7. Find all their workshop truth in one place in Me, with every behavior mapped as a success pattern and a shadow pattern

If those seven things work, the loop is alive.

---

## 17. Product Logic Summary

### Asset layers

**Foundational (created once):**
- Values + why
- Identity + why
- Vision + why

**Annual (created in 1-Year Commitment):**
- Annual Commitment
- Weekly Proof Behavior
- Success Pattern 1
- Shadow Pattern 1
- Avoidance Loop
- Repeating Trigger Pattern

**Calibration (one-time, Best-State):**
- Best-state emotions, environments, examples
- Success Pattern 2
- Shadow Pattern 2 (optional)

**Sprint (created each cycle):**
- Goal Sprint (10-31 days)
- Sprint support behavior

**Runtime loop:**
- Today proves it
- Week translates it
- Sprint commits it
- Me preserves it
- Evidence refines it
- Then the cycle repeats

---

## 18. Final Product Sentence

Me preserves the truth. Sprint commits it. Week translates it. Today proves it. Evidence refines it. Then the cycle repeats.

What most people lack is not motivation. It is clarity. Proof Arc forces precision. That is the moat.
