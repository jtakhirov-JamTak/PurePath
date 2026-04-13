import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial, date, uniqueIndex, check, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Journals table - for Course 2 journaling
export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  session: varchar("session", { length: 20 }).notNull(),
  gratitude: text("gratitude"),
  intentions: text("intentions"),
  reflections: text("reflections"),
  highlights: text("highlights"),
  challenges: text("challenges"),
  content: text("content"),
  // Proof Arc v1: structured journal fields
  selectedValueKey: varchar("selected_value_key", { length: 50 }),
  selectedValueLabel: text("selected_value_label"),
  selectedValueWhySnapshot: text("selected_value_why_snapshot"),
  proofMove: text("proof_move"),
  proofMoveCompleted: boolean("proof_move_completed"),
  helpingPatternKey: varchar("helping_pattern_key", { length: 100 }),
  hurtingPatternKey: varchar("hurting_pattern_key", { length: 100 }),
  triggerOccurred: boolean("trigger_occurred").default(false),
  shadowEmotionFlags: varchar("shadow_emotion_flags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("journals_user_date_session_idx").on(table.userId, table.date, table.session),
  index("journals_user_id_idx").on(table.userId),
  check("journal_session_check", sql`${table.session} IN ('morning', 'evening')`),
]);

export const insertJournalSchema = createInsertSchema(journals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Journal = typeof journals.$inferSelect;
export type InsertJournal = z.infer<typeof insertJournalSchema>;

// Eisenhower Matrix entries - weekly planning
export const eisenhowerEntries = pgTable("eisenhower_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: date("week_start").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  task: text("task").notNull(),
  quadrant: varchar("quadrant", { length: 10 }).notNull(),
  deadline: date("deadline"),
  timeEstimate: varchar("time_estimate", { length: 20 }),
  decision: varchar("decision", { length: 50 }),
  scheduledTime: varchar("scheduled_time", { length: 50 }),
  scheduledDate: date("scheduled_date"),
  scheduledStartTime: varchar("scheduled_start_time", { length: 10 }),
  scheduledEndTime: varchar("scheduled_end_time", { length: 10 }),
  durationMinutes: integer("duration_minutes"),
  category: varchar("category", { length: 30 }),
  goalAlignment: text("goal_alignment"),
  blocksGoal: boolean("blocks_goal").default(false),
  completed: boolean("completed").default(false),
  status: varchar("status", { length: 20 }),
  completionLevel: integer("completion_level"),
  skipReason: varchar("skip_reason", { length: 100 }),
  actualStartTime: varchar("actual_start_time", { length: 10 }),
  actualDuration: integer("actual_duration"),
  startedOnTime: boolean("started_on_time"),
  delayMinutes: integer("delay_minutes"),
  delayReason: varchar("delay_reason", { length: 100 }),
  completedRequiredTime: boolean("completed_required_time"),
  timeShortMinutes: integer("time_short_minutes"),
  timeRange: varchar("time_range", { length: 20 }),
  isBinary: boolean("is_binary").default(false),
  sortOrder: integer("sort_order").default(0),
  groupId: varchar("group_id", { length: 50 }),
  sortImportance: varchar("sort_importance", { length: 20 }),
  sortConsequence: varchar("sort_consequence", { length: 30 }),
  sortBlocker: varchar("sort_blocker", { length: 30 }),
  sortResult: varchar("sort_result", { length: 20 }),
  sortPriority: integer("sort_priority"),
  firstMove: text("first_move"),
  // Proof Engine fields
  outcome: text("outcome"),                                    // Step 4: refined outcome text
  hardTruthRelated: boolean("hard_truth_related").default(false), // Step 4: tagged as hard-truth related
  sequenceOrder: integer("sequence_order"),                    // Step 7: user-chosen sequence
  sequenceReason: varchar("sequence_reason", { length: 50 }), // Step 7: why this order
  ifThenStatement: text("if_then_statement"),                  // Step 8: Protect items
  revisitDate: date("revisit_date"),                           // Step 8: Not This Week items
  // Proof Arc v1: proof bucket classification
  proofBucket: varchar("proof_bucket", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("eisenhower_user_id_idx").on(table.userId),
  check("eisenhower_quadrant_check", sql`${table.quadrant} IN ('q1', 'q2', 'q3', 'q4', 'unsorted')`),
]);

export const insertEisenhowerEntrySchema = createInsertSchema(eisenhowerEntries).omit({
  id: true,
  createdAt: true,
});

export type EisenhowerEntry = typeof eisenhowerEntries.$inferSelect;
export type InsertEisenhowerEntry = z.infer<typeof insertEisenhowerEntrySchema>;

// Weekly summaries - opening reflection + week-level data
export const weeklySummaries = pgTable("weekly_summaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: date("week_start").notNull(),
  // Step 1: Close Last Week
  patternPullBack: text("pattern_pull_back"),
  // Step 2: Open This Week
  openStory: text("open_story"),
  openHardTruth: text("open_hard_truth"),
  openHardAction: text("open_hard_action"),
  // DEPRECATED: fear reflection moved to standalone fearLogs tool
  fearTarget: text("fear_target"),
  fearIfFaced: text("fear_if_faced"),
  fearIfAvoided: text("fear_if_avoided"),
  fearBlocker: varchar("fear_blocker", { length: 50 }),
  fearFirstMove: text("fear_first_move"),
  fearPromotedToQ2: boolean("fear_promoted_to_q2").default(false),
  fearLinkedEntryId: integer("fear_linked_entry_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("weekly_summaries_user_week_idx").on(table.userId, table.weekStart),
]);

export const insertWeeklySummarySchema = createInsertSchema(weeklySummaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WeeklySummary = typeof weeklySummaries.$inferSelect;
export type InsertWeeklySummary = z.infer<typeof insertWeeklySummarySchema>;

/** @deprecated Feature removed. Table retained for historical data only — no insert schema or types exported. */
export const empathyExercises = pgTable("empathy_exercises", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  exerciseType: varchar("exercise_type", { length: 20 }).default("debrief").notNull(),
  date: date("date").notNull(),
  who: varchar("who", { length: 100 }).notNull(),
  context: text("context"),
  theirEmotionalState: text("their_emotional_state"),
  myEmotionalState: text("my_emotional_state"),
  factsObserved: text("facts_observed"),
  howICameAcross: text("how_i_came_across"),
  howTheyLikelyFelt: text("how_they_likely_felt"),
  whatMattersToThem: text("what_matters_to_them"),
  whatTheyNeed: text("what_they_need"),
  nextAction: text("next_action"),
  didConfirm: text("did_confirm"),
  intention: text("intention"),
  leaveThemFeeling: text("leave_them_feeling"),
  triggerRiskIfThen: text("trigger_risk_if_then"),
  themHypothesis: text("them_hypothesis"),
  realityCheckQuestion: text("reality_check_question"),
  reflectionValidation: text("reflection_validation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("empathy_user_id_idx").on(table.userId),
]);

// Habit categories
export const HABIT_CATEGORIES = {
  health: { label: "Health", color: "emerald" },
  wealth: { label: "Wealth", color: "yellow" },
  relationships: { label: "Relationships", color: "rose" },
  growth: { label: "Growth", color: "blue" },
  joy: { label: "Joy", color: "amber" },
} as const;

export type HabitCategory = keyof typeof HABIT_CATEGORIES;

// Daily habits - weekly recurring habits
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 30 }).default("health"),
  timing: varchar("timing", { length: 20 }).default("afternoon"),
  cadence: varchar("cadence", { length: 50 }).notNull(),
  duration: integer("duration"),
  startDate: varchar("start_date", { length: 10 }),
  endDate: varchar("end_date", { length: 10 }),
  sortOrder: integer("sort_order").default(0),
  isBinary: boolean("is_binary").default(false),
  active: boolean("active").default(true),
  lineageId: varchar("lineage_id", { length: 36 }),
  versionNumber: integer("version_number").default(1),
  // Proof Arc v1: habit source, pinning, sprint link, precision wizard fields
  source: varchar("source", { length: 20 }).default("support"),
  isPinned: boolean("is_pinned").default(false),
  sprintId: integer("sprint_id"),
  proofPatternWhen: text("proof_pattern_when"),
  proofPatternBehavior: text("proof_pattern_behavior"),
  proofPatternOutcome: text("proof_pattern_outcome"),
  proofPatternImpact: text("proof_pattern_impact"),
  shadowEmotions: varchar("shadow_emotions"),
  shadowEnvironment: text("shadow_environment"),
  shadowBehavior: text("shadow_behavior"),
  shadowOutcome: text("shadow_outcome"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("habits_user_id_idx").on(table.userId),
  index("habits_user_lineage_idx").on(table.userId, table.lineageId),
  check("habit_category_check", sql`${table.category} IN ('health', 'wealth', 'relationships', 'growth', 'joy')`),
  check("habit_timing_check", sql`${table.timing} IN ('morning', 'afternoon', 'evening')`),
]);

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

// Habit completions - daily check-offs
export const habitCompletions = pgTable("habit_completions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  habitId: integer("habit_id").notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(),
  completionLevel: integer("completion_level"),
  skipReason: varchar("skip_reason", { length: 100 }),
  skipReasonSource: varchar("skip_reason_source", { length: 20 }),
  skipReasonTimestamp: timestamp("skip_reason_timestamp"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("habit_completions_user_habit_date_idx").on(table.userId, table.habitId, table.date),
  check("habit_completion_status_check", sql`${table.status} IN ('completed', 'skipped', 'minimum')`),
]);

export const insertHabitCompletionSchema = createInsertSchema(habitCompletions).omit({
  id: true,
  createdAt: true,
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;
export type InsertHabitCompletion = z.infer<typeof insertHabitCompletionSchema>;


// Monthly Goals - one per user per month
export const monthlyGoals = pgTable("monthly_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  monthKey: varchar("month_key", { length: 10 }).notNull(), // YYYY-MM for legacy goals, YYYY-MM-DD for sprints
  value: text("value").default(""),
  strengths: text("strengths").default(""),
  advantage: text("advantage").default(""),
  goalWhat: text("goal_what").default(""),
  goalWhen: text("goal_when").default(""),
  goalWhere: text("goal_where").default(""),
  goalHow: text("goal_how").default(""),
  blockingHabit: text("blocking_habit").default(""),
  habitAddress: text("habit_address").default(""),
  prize: text("prize").default(""),
  fun: text("fun").default(""),
  deadline: text("deadline").default(""),
  goalStatement: text("goal_statement").notNull().default(""),
  successMarker: text("success_marker").default(""),
  why: text("why").default(""),
  nextConcreteStep: text("next_concrete_step").notNull().default(""),
  successProof: text("success_proof").default(""),
  proofMetric: text("proof_metric").default(""),
  weeklyBehavior: text("weekly_behavior").default(""),
  bestResult: text("best_result").default(""),
  innerObstacle: text("inner_obstacle").default(""),
  obstacleTrigger: text("obstacle_trigger").default(""),
  obstacleThought: text("obstacle_thought").default(""),
  obstacleEmotion: text("obstacle_emotion").default(""),
  obstacleBehavior: text("obstacle_behavior").default(""),
  ifThenPlan1: text("if_then_plan_1").default(""),
  ifThenPlan2: text("if_then_plan_2").default(""),
  personStatement: text("person_statement").default(""),
  confidenceCheck: integer("confidence_check"),
  // Proof Arc v1: sprint fields (monthly_goals will become goal_sprints later)
  sprintName: varchar("sprint_name", { length: 200 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  needsSprintReview: boolean("needs_sprint_review").default(false),
  needsSprintReviewReason: text("needs_sprint_review_reason"),
  sprintStatus: varchar("sprint_status", { length: 20 }).default("active"),
  closedAs: varchar("closed_as", { length: 20 }),
  carryForwardCount: integer("carry_forward_count").default(0),
  milestone1Text: text("milestone_1_text"),
  milestone1TargetWeek: date("milestone_1_target_week"),
  milestone1Note: text("milestone_1_note"),
  milestone2Text: text("milestone_2_text"),
  milestone2TargetWeek: date("milestone_2_target_week"),
  milestone2Note: text("milestone_2_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("monthly_goals_user_month_idx").on(table.userId, table.monthKey),
  // Enforce single active sprint per user at the database level.
  uniqueIndex("monthly_goals_one_active_per_user_idx").on(table.userId).where(sql`${table.sprintStatus} = 'active'`),
  index("monthly_goals_user_id_idx").on(table.userId),
  check("confidence_check_range", sql`${table.confidenceCheck} IS NULL OR ${table.confidenceCheck} BETWEEN 0 AND 10`),
]);

export const insertMonthlyGoalSchema = createInsertSchema(monthlyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MonthlyGoal = typeof monthlyGoals.$inferSelect;
export type InsertMonthlyGoal = z.infer<typeof insertMonthlyGoalSchema>;

export const identityDocuments = pgTable("identity_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  identity: text("identity").notNull().default(""),
  vision: text("vision").notNull().default(""),
  values: text("values").notNull().default(""),
  /** @deprecated Proof Arc v1: use annual_commitments.visualization instead. Column kept for data preservation. */
  yearVision: text("year_vision").default(""),
  /** @deprecated Proof Arc v1: use annual_commitments.visualization instead. Column kept for data preservation. */
  yearVisualization: text("year_visualization").default(""),
  visionBoardMain: text("vision_board_main").default(""),
  visionBoardLeft: text("vision_board_left").default(""),
  visionBoardRight: text("vision_board_right").default(""),
  purpose: text("purpose").default(""),
  /** @deprecated Proof Arc v1: use journals.selectedValueKey instead. Column kept for data preservation. */
  todayValue: varchar("today_value", { length: 200 }).default(""),
  /** @deprecated Proof Arc v1: use journals.proofMove instead. Column kept for data preservation. */
  todayIntention: text("today_intention").default(""),
  /** @deprecated Proof Arc v1: use evening journal structured fields instead. Column kept for data preservation. */
  todayReflection: text("today_reflection").default(""),
  /** @deprecated Proof Arc v1: removed from workflow. Column kept for data preservation. */
  othersWillSee: text("others_will_see").default(""),
  // DEPRECATED: moved to patternProfiles — columns kept for data preservation
  beYourself: text("be_yourself").default(""),
  // DEPRECATED: moved to patternProfiles
  strengths: text("strengths").default(""),
  // DEPRECATED: moved to patternProfiles
  helpingPatterns: text("helping_patterns").default(""),
  // DEPRECATED: moved to patternProfiles
  hurtingPatterns: text("hurting_patterns").default(""),
  // DEPRECATED: moved to patternProfiles
  stressResponses: text("stress_responses").default(""),
  /** @deprecated Proof Arc v1: use annual_commitments.domain instead. Column kept for data preservation. */
  visionDomain: varchar("vision_domain", { length: 50 }).default(""),
  // Proof Arc v1
  acceptanceTruth: text("acceptance_truth").default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIdentityDocumentSchema = createInsertSchema(identityDocuments).omit({
  id: true,
  updatedAt: true,
});

export type IdentityDocument = typeof identityDocuments.$inferSelect;
export type InsertIdentityDocument = z.infer<typeof insertIdentityDocumentSchema>;

// Pattern Profiles - structured behavioral patterns, one row per user
export const patternProfiles = pgTable("pattern_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  // Helping patterns (3 × 4)
  helpingPattern1Condition: text("helping_pattern_1_condition").default(""),
  helpingPattern1Behavior: text("helping_pattern_1_behavior").default(""),
  helpingPattern1Impact: text("helping_pattern_1_impact").default(""),
  helpingPattern1Outcome: text("helping_pattern_1_outcome").default(""),
  helpingPattern2Condition: text("helping_pattern_2_condition").default(""),
  helpingPattern2Behavior: text("helping_pattern_2_behavior").default(""),
  helpingPattern2Impact: text("helping_pattern_2_impact").default(""),
  helpingPattern2Outcome: text("helping_pattern_2_outcome").default(""),
  helpingPattern3Condition: text("helping_pattern_3_condition").default(""),
  helpingPattern3Behavior: text("helping_pattern_3_behavior").default(""),
  helpingPattern3Impact: text("helping_pattern_3_impact").default(""),
  helpingPattern3Outcome: text("helping_pattern_3_outcome").default(""),
  // Hurting patterns (3 × 4)
  hurtingPattern1Condition: text("hurting_pattern_1_condition").default(""),
  hurtingPattern1Behavior: text("hurting_pattern_1_behavior").default(""),
  hurtingPattern1Impact: text("hurting_pattern_1_impact").default(""),
  hurtingPattern1Outcome: text("hurting_pattern_1_outcome").default(""),
  hurtingPattern2Condition: text("hurting_pattern_2_condition").default(""),
  hurtingPattern2Behavior: text("hurting_pattern_2_behavior").default(""),
  hurtingPattern2Impact: text("hurting_pattern_2_impact").default(""),
  hurtingPattern2Outcome: text("hurting_pattern_2_outcome").default(""),
  hurtingPattern3Condition: text("hurting_pattern_3_condition").default(""),
  hurtingPattern3Behavior: text("hurting_pattern_3_behavior").default(""),
  hurtingPattern3Impact: text("hurting_pattern_3_impact").default(""),
  hurtingPattern3Outcome: text("hurting_pattern_3_outcome").default(""),
  // Primary Repeating Loop
  repeatingLoopStory: text("repeating_loop_story").default(""),
  repeatingLoopAvoidance: text("repeating_loop_avoidance").default(""),
  repeatingLoopCost: text("repeating_loop_cost").default(""),
  repeatingLoopCommitment: text("repeating_loop_commitment").default(""),
  repeatingLoopBehavior: text("repeating_loop_behavior").default(""),
  // Trigger Pattern (reference template)
  triggerPatternTrigger: text("trigger_pattern_trigger").default(""),
  triggerPatternInterpretation: text("trigger_pattern_interpretation").default(""),
  triggerPatternEmotion: text("trigger_pattern_emotion").default(""),
  triggerPatternUrge: text("trigger_pattern_urge").default(""),
  triggerPatternBehavior: text("trigger_pattern_behavior").default(""),
  triggerPatternOutcome: text("trigger_pattern_outcome").default(""),
  // Blind Spots (3 × 2)
  blindSpot1Pattern: text("blind_spot_1_pattern").default(""),
  blindSpot1Outcome: text("blind_spot_1_outcome").default(""),
  blindSpot2Pattern: text("blind_spot_2_pattern").default(""),
  blindSpot2Outcome: text("blind_spot_2_outcome").default(""),
  blindSpot3Pattern: text("blind_spot_3_pattern").default(""),
  blindSpot3Outcome: text("blind_spot_3_outcome").default(""),
  // Proof Arc v1: shadow pattern emotions/environments + best-state calibration
  hurtingPattern1Emotions: varchar("hurting_pattern_1_emotions"),
  hurtingPattern1Environment: text("hurting_pattern_1_environment"),
  hurtingPattern2Emotions: varchar("hurting_pattern_2_emotions"),
  hurtingPattern2Environment: text("hurting_pattern_2_environment"),
  hurtingPattern3Emotions: varchar("hurting_pattern_3_emotions"),
  hurtingPattern3Environment: text("hurting_pattern_3_environment"),
  bestStateEmotions: varchar("best_state_emotions"),
  bestStateEnvironments: text("best_state_environments"),
  bestStateExamplesJson: text("best_state_examples_json"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatternProfileSchema = createInsertSchema(patternProfiles).omit({
  id: true,
  updatedAt: true,
});

export type PatternProfile = typeof patternProfiles.$inferSelect;
export type InsertPatternProfile = z.infer<typeof insertPatternProfileSchema>;

export const toolUsageLogs = pgTable("tool_usage_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  moodBefore: integer("mood_before").notNull(),
  emotionBefore: varchar("emotion_before", { length: 100 }).notNull(),
  moodAfter: integer("mood_after"),
  emotionAfter: varchar("emotion_after", { length: 100 }),
  completed: boolean("completed").default(false),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tool_usage_user_id_idx").on(table.userId),
  check("mood_before_range", sql`${table.moodBefore} BETWEEN 1 AND 5`),
  check("mood_after_range", sql`${table.moodAfter} IS NULL OR ${table.moodAfter} BETWEEN 1 AND 5`),
]);

export const insertToolUsageLogSchema = createInsertSchema(toolUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type ToolUsageLog = typeof toolUsageLogs.$inferSelect;
export type InsertToolUsageLog = z.infer<typeof insertToolUsageLogSchema>;

export const triggerLogs = pgTable("trigger_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  timeOfDay: varchar("time_of_day", { length: 20 }),
  context: varchar("context", { length: 50 }),
  triggerText: text("trigger_text").notNull(),
  emotion: varchar("emotion", { length: 50 }),
  emotionIntensity: integer("emotion_intensity"),
  urge: varchar("urge", { length: 50 }),
  urgeIntensity: integer("urge_intensity"),
  whatIDid: text("what_i_did"),
  outcome: text("outcome"),
  recoveryMinutes: integer("recovery_minutes"),
  appraisal: text("appraisal"),
  actionTaken: varchar("action_taken", { length: 100 }),
  bodyState: text("body_state"),
  recoveryTime: varchar("recovery_time", { length: 50 }),
  reflection: text("reflection"),
  fromTemplate: boolean("from_template").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("trigger_logs_user_id_idx").on(table.userId),
  check("trigger_emotion_intensity_range", sql`${table.emotionIntensity} IS NULL OR ${table.emotionIntensity} BETWEEN 1 AND 10`),
  check("trigger_urge_intensity_range", sql`${table.urgeIntensity} IS NULL OR ${table.urgeIntensity} BETWEEN 1 AND 10`),
]);

export const insertTriggerLogSchema = createInsertSchema(triggerLogs).omit({
  id: true,
  createdAt: true,
});

export type TriggerLog = typeof triggerLogs.$inferSelect;
export type InsertTriggerLog = z.infer<typeof insertTriggerLogSchema>;

// Fear Logs - standalone Face the Fear tool
export const fearLogs = pgTable("fear_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  fearTarget: text("fear_target").notNull(),
  fearIfFaced: text("fear_if_faced"),
  fearIfAvoided: text("fear_if_avoided"),
  fearBlocker: varchar("fear_blocker", { length: 50 }),
  fearFirstMove: text("fear_first_move"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fear_logs_user_id_idx").on(table.userId),
]);

export const insertFearLogSchema = createInsertSchema(fearLogs).omit({
  id: true,
  createdAt: true,
});

export type FearLog = typeof fearLogs.$inferSelect;
export type InsertFearLog = z.infer<typeof insertFearLogSchema>;

export const avoidanceLogs = pgTable("avoidance_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  avoidingWhat: text("avoiding_what").notNull(),
  avoidanceDelay: varchar("avoidance_delay", { length: 50 }),
  discomfort: integer("discomfort").notNull(),
  smallestExposure: text("smallest_exposure"),
  startedNow: boolean("started_now").default(false),
  selectedValue: text("selected_value"),
  anticipatedOutcome: text("anticipated_outcome"),
  scheduledTime: varchar("scheduled_time", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("avoidance_logs_user_id_idx").on(table.userId),
  check("avoidance_discomfort_range", sql`${table.discomfort} BETWEEN 1 AND 5`),
]);

export const insertAvoidanceLogSchema = createInsertSchema(avoidanceLogs).omit({
  id: true,
  createdAt: true,
});

export type AvoidanceLog = typeof avoidanceLogs.$inferSelect;
export type InsertAvoidanceLog = z.infer<typeof insertAvoidanceLogSchema>;

/** @deprecated Feature removed. Table retained for historical data only — no insert schema or types exported. */
export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStart: date("week_start").notNull(),
  fear: text("fear").notNull(),
  blocker: varchar("blocker", { length: 100 }),
  problemStatement: text("problem_statement"),
  constraints: text("constraints"),           // JSON array
  successLooksLike: text("success_looks_like"),
  mustHaves: text("must_haves"),              // JSON array
  niceToHaves: text("nice_to_haves"),         // JSON array
  notAllowed: text("not_allowed"),            // JSON array
  fearDump: text("fear_dump"),                 // JSON array
  noFearSolutions: text("no_fear_solutions"), // JSON array
  doorType: varchar("door_type", { length: 20 }),
  decisionStatement: text("decision_statement"),
  consultQuestion: text("consult_question"),
  firstPhysicalStep: text("first_physical_step"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("decisions_user_id_idx").on(table.userId),
]);

// Insert schema and types removed — table is deprecated

export const containmentLogs = pgTable("containment_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  branch: varchar("branch", { length: 20 }).notNull(),
  emotion: varchar("emotion", { length: 100 }),
  emotionReason: text("emotion_reason"),
  moveAction: text("move_action"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("containment_logs_user_id_idx").on(table.userId),
]);

export const insertContainmentLogSchema = createInsertSchema(containmentLogs).omit({
  id: true,
  createdAt: true,
});

export type ContainmentLog = typeof containmentLogs.$inferSelect;
export type InsertContainmentLog = z.infer<typeof insertContainmentLogSchema>;

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  onboardingStep: integer("onboarding_step").default(0).notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  hasAccess: boolean("has_access").default(false).notNull(),
  personalEmail: varchar("personal_email", { length: 255 }),
  cohort: varchar("cohort", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_settings_user_id_idx").on(table.userId),
]);

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Proof Arc v1: Workshop Seed — one-time snapshot of all workshop-generated data
export const workshopSeeds = pgTable("workshop_seeds", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  source: varchar("source", { length: 100 }),
  identityStatement: text("identity_statement"),
  valuesJson: text("values_json"),
  vision: text("vision"),
  purpose: text("purpose"),
  successPatternsJson: text("success_patterns_json"),
  shadowPatternsJson: text("shadow_patterns_json"),
  triggerPatternJson: text("trigger_pattern_json"),
  avoidanceLoopJson: text("avoidance_loop_json"),
  blindSpotsJson: text("blind_spots_json"),
  acceptanceTruth: text("acceptance_truth"),
  bestStateCalibrationJson: text("best_state_calibration_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkshopSeedSchema = createInsertSchema(workshopSeeds).omit({
  id: true,
  createdAt: true,
});

export type WorkshopSeed = typeof workshopSeeds.$inferSelect;
export type InsertWorkshopSeed = z.infer<typeof insertWorkshopSeedSchema>;

// Proof Arc v1: Annual Commitments — annual commitment with linked proof behavior
export const annualCommitments = pgTable("annual_commitments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  domain: varchar("domain", { length: 100 }),
  personStatement: text("person_statement"),
  proofPoint: text("proof_point"),
  proofMetric: text("proof_metric"),
  visualization: text("visualization"),
  weeklyProofBehaviorHabitId: integer("weekly_proof_behavior_habit_id"),
  ifThenPlan1: text("if_then_plan_1"),
  ifThenPlan2: text("if_then_plan_2"),
  confidenceCheck: integer("confidence_check"),
  obstacle: text("obstacle"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("annual_commitments_user_id_idx").on(table.userId),
  check("annual_commitment_confidence_range", sql`${table.confidenceCheck} IS NULL OR ${table.confidenceCheck} BETWEEN 0 AND 10`),
]);

export const insertAnnualCommitmentSchema = createInsertSchema(annualCommitments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AnnualCommitment = typeof annualCommitments.$inferSelect;
export type InsertAnnualCommitment = z.infer<typeof insertAnnualCommitmentSchema>;

