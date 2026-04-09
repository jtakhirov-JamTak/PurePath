import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format");
const optionalDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format").optional().nullable();
const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min, `Must be at least ${min} character(s)`).max(max, `Must be at most ${max} characters`);
const optionalString = (max: number) => z.string().max(max, `Must be at most ${max} characters`).optional().nullable();
const optionalTrimmedString = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`).optional().nullable();

const quadrantEnum = z.enum(["q1", "q2", "q3", "q4", "unsorted"]);
const categoryEnum = z.enum(["health", "wealth", "relationships", "growth", "joy"]);
const timingEnum = z.enum(["morning", "afternoon", "evening"]);
const decisionEnum = z.enum(["do_today", "schedule", "delegate", "delete"]);
const sessionEnum = z.enum(["morning", "evening"]);
const completionStatusEnum = z.enum(["completed", "skipped"]);

// Sort classification enums (Step 5 Classify)
export const sortImportanceEnum = z.enum(["clearly", "somewhat", "not_really"]);
// Expanded: old values kept for historical data, new values for Proof Engine
export const sortConsequenceEnum = z.enum([
  "real_consequence", "stays_important", "someone_annoyed", "basically_nothing",  // legacy
  "deadline_breaks", "task_blocked", "cost_worse", "important_nothing_breaks", "not_much",  // proof engine
]);
export const sortResistanceEnum = z.enum(["low_value", "uncomfortable", "straightforward"]); // DEPRECATED
export const sortBlockerEnum = z.enum(["avoiding_discomfort", "unclear_next_step", "need_someone_else", "nothing"]);
export const sortResultEnum = z.enum(["handle", "protect", "not_this_week"]);

export const createEisenhowerSchema = z.object({
  task: trimmedString(1, 500),
  weekStart: dateString,
  role: z.string().max(50, "Role must be at most 50 characters").default(""),
  quadrant: quadrantEnum,
  deadline: optionalDateString,
  timeEstimate: optionalString(20),
  decision: decisionEnum.optional().nullable(),
  scheduledTime: optionalString(50),
  scheduledDate: optionalDateString,
  scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format").optional().nullable(),
  scheduledEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format").optional().nullable(),
  durationMinutes: z.number().int().min(30).max(720).optional().nullable(),
  category: categoryEnum.optional().nullable(),
  goalAlignment: optionalString(500),
  blocksGoal: z.boolean().optional().nullable(),
  isBinary: z.boolean().optional().nullable(),
  completed: z.boolean().optional().nullable(),
  status: optionalString(20),
  completionLevel: z.number().int().min(0).max(2).optional().nullable(),
  skipReason: optionalString(100),
  actualStartTime: optionalString(10),
  actualDuration: z.number().int().positive().optional().nullable(),
  startedOnTime: z.boolean().optional().nullable(),
  delayMinutes: z.number().int().min(0).optional().nullable(),
  delayReason: optionalString(100),
  completedRequiredTime: z.boolean().optional().nullable(),
  timeShortMinutes: z.number().int().min(0).optional().nullable(),
  timeRange: z.enum(["morning", "afternoon", "evening"]).optional().nullable(),
  sortOrder: z.number().int().min(0).optional().nullable(),
  groupId: z.string().max(50).optional().nullable(),
  sortImportance: sortImportanceEnum.optional().nullable(),
  sortConsequence: sortConsequenceEnum.optional().nullable(),
  sortResistance: sortResistanceEnum.optional().nullable(),
  sortBlocker: sortBlockerEnum.optional().nullable(),
  sortResult: sortResultEnum.optional().nullable(),
  sortPriority: z.number().int().min(0).optional().nullable(),
  firstMove: optionalString(2000),
  outcome: optionalString(2000),
  hardTruthRelated: z.boolean().optional().nullable(),
  sequenceOrder: z.number().int().min(0).optional().nullable(),
  sequenceReason: optionalString(50),
  ifThenStatement: optionalString(2000),
  revisitDate: optionalDateString,
});

export const updateEisenhowerSchema = createEisenhowerSchema.partial();

export const createEmpathySchema = z.object({
  exerciseType: z.enum(["prep", "debrief"]).default("debrief"),
  date: dateString,
  who: trimmedString(1, 100),
  context: optionalString(2000),
  theirEmotionalState: optionalString(2000),
  myEmotionalState: optionalString(2000),
  factsObserved: optionalString(2000),
  howICameAcross: optionalString(2000),
  howTheyLikelyFelt: optionalString(2000),
  whatMattersToThem: optionalString(2000),
  whatTheyNeed: optionalString(2000),
  nextAction: optionalString(2000),
  didConfirm: optionalString(2000),
  intention: optionalString(2000),
  leaveThemFeeling: optionalString(2000),
  triggerRiskIfThen: optionalString(2000),
  themHypothesis: optionalString(2000),
  realityCheckQuestion: optionalString(2000),
  reflectionValidation: optionalString(2000),
});

export const updateEmpathySchema = createEmpathySchema.partial();

export const createHabitSchema = z.object({
  name: trimmedString(1, 200),
  category: categoryEnum.optional().nullable(),
  timing: timingEnum.optional().nullable(),
  cadence: z.string().max(50, "Cadence must be at most 50 characters"),
  duration: z.number().int().positive("Must be a positive integer").optional().nullable(),
  startDate: optionalString(10),
  endDate: optionalString(10),
  sortOrder: z.number().int().min(0).optional().nullable(),
  isBinary: z.boolean().optional().nullable(),
  active: z.boolean().optional().nullable(),
  lineageId: z.string().optional().nullable(),
  versionNumber: z.number().int().optional().nullable(),
});

export const updateHabitSchema = createHabitSchema.partial();

export const createHabitCompletionSchema = z.object({
  habitId: z.number().int().positive("habitId must be a positive integer"),
  date: dateString,
  status: z.enum(["completed", "skipped", "minimum"]).optional().nullable(),
  completionLevel: z.number().int().min(0).max(2).optional().nullable(),
  skipReason: optionalString(100),
  skipReasonSource: z.enum(["reflection", "in_moment"]).optional().nullable(),
  skipReasonTimestamp: z.string().datetime().optional().nullable(),
});


export const createJournalSchema = z.object({
  date: dateString,
  session: sessionEnum,
  gratitude: optionalString(5000),
  intentions: optionalString(5000),
  reflections: optionalString(5000),
  highlights: optionalString(5000),
  challenges: optionalString(5000),
  content: z.string().max(100000, "Content must be at most 100KB").optional().nullable(),
});

export const createToolUsageSchema = z.object({
  toolName: trimmedString(1, 100),
  moodBefore: z.number().int().min(1, "Mood must be between 1 and 5").max(5, "Mood must be between 1 and 5"),
  emotionBefore: trimmedString(1, 100),
  moodAfter: z.number().int().min(1, "Mood must be between 1 and 5").max(5, "Mood must be between 1 and 5").optional().nullable(),
  emotionAfter: optionalString(100),
  completed: z.boolean().optional().nullable(),
  date: dateString,
});

export const updateToolUsageSchema = createToolUsageSchema.partial();

export const identityDocumentSchema = z.object({
  identity: optionalTrimmedString(5000),
  vision: optionalTrimmedString(5000),
  values: optionalTrimmedString(5000),
  yearVision: optionalTrimmedString(5000),
  yearVisualization: optionalTrimmedString(5000),
  purpose: optionalTrimmedString(5000),
  todayValue: optionalTrimmedString(2000),
  todayIntention: optionalTrimmedString(2000),
  todayReflection: optionalTrimmedString(2000),
  visionBoardMain: optionalString(10 * 1024 * 1024),
  visionBoardLeft: optionalString(10 * 1024 * 1024),
  visionBoardRight: optionalString(10 * 1024 * 1024),
  othersWillSee: optionalTrimmedString(5000),
  // DEPRECATED: beYourself, strengths, helpingPatterns, hurtingPatterns, stressResponses moved to patternProfiles
  visionDomain: optionalTrimmedString(500),
});

export const monthlyGoalSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format").optional(),
  goalStatement: optionalTrimmedString(2000),
  successMarker: optionalTrimmedString(2000),
  value: optionalTrimmedString(500),
  why: optionalTrimmedString(2000),
  nextConcreteStep: optionalTrimmedString(2000),
  prize: optionalTrimmedString(500),
  strengths: optionalTrimmedString(2000),
  advantage: optionalTrimmedString(2000),
  goalWhat: optionalTrimmedString(2000),
  goalWhen: optionalTrimmedString(500),
  goalWhere: optionalTrimmedString(500),
  goalHow: optionalTrimmedString(2000),
  blockingHabit: optionalTrimmedString(2000),
  habitAddress: optionalTrimmedString(2000),
  fun: optionalTrimmedString(2000),
  deadline: optionalTrimmedString(500),
  successProof: optionalTrimmedString(2000),
  proofMetric: optionalTrimmedString(2000),
  weeklyBehavior: optionalTrimmedString(2000),
  bestResult: optionalTrimmedString(2000),
  innerObstacle: optionalTrimmedString(2000),
  obstacleTrigger: optionalTrimmedString(2000),
  obstacleThought: optionalTrimmedString(2000),
  obstacleEmotion: optionalTrimmedString(2000),
  obstacleBehavior: optionalTrimmedString(2000),
  ifThenPlan1: optionalTrimmedString(2000),
  ifThenPlan2: optionalTrimmedString(2000),
  personStatement: optionalTrimmedString(2000),
  confidenceCheck: z.number().int().min(0).max(10).optional().nullable(),
});

export const updateHabitCompletionSchema = z.object({
  status: z.enum(["completed", "skipped", "minimum"]),
  completionLevel: z.number().int().min(0).max(2).optional().nullable(),
  skipReason: optionalString(500),
  skipReasonSource: z.enum(["reflection", "in_moment"]).optional().nullable(),
  skipReasonTimestamp: z.string().datetime().optional().nullable(),
});

export const visionBoardSchema = z.object({
  slot: z.enum(["main", "left", "right"]),
  imageData: z.string().max(10 * 1024 * 1024, "Image data must be at most 10MB").optional().nullable(),
});

export const createAvoidanceLogSchema = z.object({
  date: dateString,
  avoidingWhat: trimmedString(1, 2000),
  avoidanceDelay: optionalString(50),
  discomfort: z.number().int().min(1).max(5),
  smallestExposure: optionalString(2000),
  startedNow: z.boolean().optional().nullable(),
  selectedValue: optionalString(500),
  anticipatedOutcome: optionalString(2000),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format").optional().nullable(),
});

export const fearBlockerEnum = z.enum([
  "getting_it_wrong",
  "being_judged",
  "disappointing_someone",
  "uncertainty",
  "waiting_for_permission",
  "hoping_someone_else_decides",
  "shame_discomfort",
  "succeeding_and_sustaining",
]);

export const commitWeekItemSchema = z.object({
  task: z.string().trim().min(1).max(500),
  quadrant: z.enum(["q1", "q2", "q4"]),
  sortOrder: z.number().int().min(0),
  groupId: z.string().min(1).max(50),
  scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(5),
  scheduledStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  scheduledEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  firstMove: z.string().trim().max(2000).optional().nullable(),
  sortImportance: sortImportanceEnum.optional().nullable(),
  sortConsequence: sortConsequenceEnum.optional().nullable(),
  sortResistance: sortResistanceEnum.optional().nullable(),
  sortBlocker: sortBlockerEnum.optional().nullable(),
  sortResult: sortResultEnum,
  sortPriority: z.number().int().min(0),
  // Proof Engine fields
  outcome: z.string().trim().max(2000).optional().nullable(),
  hardTruthRelated: z.boolean().optional().nullable(),
  sequenceOrder: z.number().int().min(0).optional().nullable(),
  sequenceReason: z.string().max(50).optional().nullable(),
  ifThenStatement: z.string().trim().max(2000).optional().nullable(),
  revisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const openingDataSchema = z.object({
  patternPullBack: z.string().trim().max(5000).optional().nullable(),
  openStory: z.string().trim().max(5000).optional().nullable(),
  openHardTruth: z.string().trim().max(5000).optional().nullable(),
  openHardAction: z.string().trim().max(5000).optional().nullable(),
});

export const commitWeekSchema = z.object({
  weekStart: dateString,
  items: z.array(commitWeekItemSchema).min(1).max(30),
  openingData: openingDataSchema.optional().nullable(),
  // DEPRECATED: fear data no longer collected in weekly flow
  fearData: z.object({
    fearTarget: z.string().trim().min(1).max(500),
    fearIfFaced: z.string().trim().min(1).max(2000),
    fearIfAvoided: z.string().trim().min(1).max(2000),
    fearBlocker: fearBlockerEnum,
    fearFirstMove: z.string().trim().min(1).max(2000),
    fearPromotedToQ2: z.boolean(),
  }).optional().nullable(),
});

export const saveFearSchema = z.object({
  weekStart: dateString,
  fearTarget: z.string().trim().min(1).max(500),
  fearIfFaced: z.string().trim().min(1).max(2000),
  fearIfAvoided: z.string().trim().min(1).max(2000),
  fearBlocker: fearBlockerEnum,
  fearFirstMove: z.string().trim().min(1).max(2000),
  fearPromotedToQ2: z.boolean(),
});

export const createContainmentLogSchema = z.object({
  date: dateString,
  branch: z.enum(["overwhelmed", "avoiding"]),
  emotion: optionalString(100),
  emotionReason: optionalString(2000),
  moveAction: optionalString(2000),
  completed: z.boolean().optional().nullable(),
});

export const createTriggerLogSchema = z.object({
  date: dateString,
  triggerText: trimmedString(1, 2000),
  appraisal: optionalString(2000),
  emotion: optionalString(50),
  urge: optionalString(50),
  whatIDid: optionalString(2000),
  outcome: optionalString(2000),
  fromTemplate: z.boolean().optional().default(false),
});

export const patternProfileSchema = z.object({
  helpingPattern1Condition: optionalTrimmedString(5000),
  helpingPattern1Behavior: optionalTrimmedString(5000),
  helpingPattern1Impact: optionalTrimmedString(5000),
  helpingPattern1Outcome: optionalTrimmedString(5000),
  helpingPattern2Condition: optionalTrimmedString(5000),
  helpingPattern2Behavior: optionalTrimmedString(5000),
  helpingPattern2Impact: optionalTrimmedString(5000),
  helpingPattern2Outcome: optionalTrimmedString(5000),
  helpingPattern3Condition: optionalTrimmedString(5000),
  helpingPattern3Behavior: optionalTrimmedString(5000),
  helpingPattern3Impact: optionalTrimmedString(5000),
  helpingPattern3Outcome: optionalTrimmedString(5000),
  hurtingPattern1Condition: optionalTrimmedString(5000),
  hurtingPattern1Behavior: optionalTrimmedString(5000),
  hurtingPattern1Impact: optionalTrimmedString(5000),
  hurtingPattern1Outcome: optionalTrimmedString(5000),
  hurtingPattern2Condition: optionalTrimmedString(5000),
  hurtingPattern2Behavior: optionalTrimmedString(5000),
  hurtingPattern2Impact: optionalTrimmedString(5000),
  hurtingPattern2Outcome: optionalTrimmedString(5000),
  hurtingPattern3Condition: optionalTrimmedString(5000),
  hurtingPattern3Behavior: optionalTrimmedString(5000),
  hurtingPattern3Impact: optionalTrimmedString(5000),
  hurtingPattern3Outcome: optionalTrimmedString(5000),
  repeatingLoopStory: optionalTrimmedString(5000),
  repeatingLoopAvoidance: optionalTrimmedString(5000),
  repeatingLoopCost: optionalTrimmedString(5000),
  triggerPatternTrigger: optionalTrimmedString(5000),
  triggerPatternInterpretation: optionalTrimmedString(5000),
  triggerPatternEmotion: optionalTrimmedString(5000),
  triggerPatternUrge: optionalTrimmedString(5000),
  triggerPatternBehavior: optionalTrimmedString(5000),
  triggerPatternOutcome: optionalTrimmedString(5000),
  blindSpot1Pattern: optionalTrimmedString(5000),
  blindSpot1Outcome: optionalTrimmedString(5000),
  blindSpot2Pattern: optionalTrimmedString(5000),
  blindSpot2Outcome: optionalTrimmedString(5000),
  blindSpot3Pattern: optionalTrimmedString(5000),
  blindSpot3Outcome: optionalTrimmedString(5000),
});

export const reorderItemSchema = z.object({
  id: z.number().int().positive(),
  sortOrder: z.number().int().min(0),
  timing: z.enum(["morning", "afternoon", "evening"]).optional(),
  timeRange: z.enum(["morning", "afternoon", "evening"]).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const reorderSchema = z.object({
  items: z.array(reorderItemSchema).min(1).max(100),
});

export const updateAccessSchema = z.object({
  hasAccess: z.boolean(),
});

export const updateCohortSchema = z.object({
  cohort: z.string().trim().max(100).nullable(),
});

export const batchAccessSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(200),
  hasAccess: z.boolean(),
});

export const registerSchema = z.object({
  email: z.string().email("A valid email is required").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  accessCode: z.string().min(1, "Access code is required").max(50),
});

export const loginSchema = z.object({
  email: z.string().email("A valid email is required").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

export const updateOnboardingSchema = z.object({
  step: z.number().int("Step must be an integer").min(0).max(10),
});

export const createFearLogSchema = z.object({
  date: dateString,
  fearTarget: trimmedString(1, 500),
  fearIfFaced: optionalString(2000),
  fearIfAvoided: optionalString(2000),
  fearBlocker: fearBlockerEnum.optional().nullable(),
  fearFirstMove: optionalString(2000),
});
