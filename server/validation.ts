import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format");
const optionalDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format").optional().nullable();
const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min, `Must be at least ${min} character(s)`).max(max, `Must be at most ${max} characters`);
const optionalString = (max: number) => z.string().max(max, `Must be at most ${max} characters`).optional().nullable();
const optionalTrimmedString = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`).optional().nullable();

const quadrantEnum = z.enum(["q1", "q2", "q3", "q4"]);
const categoryEnum = z.enum(["health", "wealth", "relationships", "career", "mindfulness", "learning"]);
const habitTypeEnum = z.enum(["goal", "learning", "maintenance"]);
const timingEnum = z.enum(["morning", "daily", "evening"]);
const decisionEnum = z.enum(["do_today", "schedule", "delegate", "delete"]);
const sessionEnum = z.enum(["morning", "evening"]);
const completionStatusEnum = z.enum(["completed", "skipped"]);

export const createEisenhowerSchema = z.object({
  task: trimmedString(1, 500),
  weekStart: dateString,
  role: z.string().max(50, "Role must be at most 50 characters"),
  quadrant: quadrantEnum,
  deadline: optionalDateString,
  timeEstimate: optionalString(20),
  decision: decisionEnum.optional().nullable(),
  scheduledTime: optionalString(50),
  scheduledDate: optionalDateString,
  scheduledStartTime: optionalString(10),
  durationMinutes: z.number().int().positive("Must be a positive integer").optional().nullable(),
  goalAlignment: optionalString(500),
  blocksGoal: z.boolean().optional().nullable(),
  completed: z.boolean().optional().nullable(),
  status: optionalString(20),
});

export const updateEisenhowerSchema = createEisenhowerSchema.partial();

export const createEmpathySchema = z.object({
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
});

export const updateEmpathySchema = createEmpathySchema.partial();

export const createHabitSchema = z.object({
  name: trimmedString(1, 200),
  category: categoryEnum.optional().nullable(),
  habitType: habitTypeEnum.optional().nullable(),
  timing: timingEnum.optional().nullable(),
  cadence: z.string().max(50, "Cadence must be at most 50 characters"),
  recurring: optionalString(20),
  duration: z.number().int().positive("Must be a positive integer").optional().nullable(),
  time: z.string().max(20, "Time must be at most 20 characters"),
  motivatingReason: optionalString(1000),
  intervalWeeks: z.number().int().positive("Must be a positive integer").optional().nullable(),
  startTime: optionalString(10),
  endTime: optionalString(10),
  startDate: optionalString(10),
  endDate: optionalString(10),
  active: z.boolean().optional().nullable(),
  googleCalendarEventId: optionalString(100),
});

export const updateHabitSchema = createHabitSchema.partial();

export const createHabitCompletionSchema = z.object({
  habitId: z.number().int().positive("habitId must be a positive integer"),
  date: dateString,
  status: completionStatusEnum.optional().nullable(),
});

export const createTaskSchema = z.object({
  title: trimmedString(1, 200),
  date: dateString,
  time: z.string().max(20, "Time must be at most 20 characters"),
  quadrant: quadrantEnum.optional().nullable(),
  scheduledTime: optionalString(50),
  completed: z.boolean().optional().nullable(),
  googleCalendarEventId: optionalString(100),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createMeditationInsightSchema = z.object({
  date: dateString,
  insight: trimmedString(1, 5000),
});

export const createJournalSchema = z.object({
  date: dateString,
  session: sessionEnum,
  gratitude: optionalString(5000),
  intentions: optionalString(5000),
  reflections: optionalString(5000),
  highlights: optionalString(5000),
  challenges: optionalString(5000),
  tomorrowGoals: optionalString(5000),
  content: z.string().optional().nullable(),
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

export const createCustomToolSchema = z.object({
  name: trimmedString(1, 100),
  description: optionalString(1000),
  instructions: optionalString(5000),
  icon: optionalString(50),
  active: z.boolean().optional().nullable(),
});

export const updateCustomToolSchema = createCustomToolSchema.partial();

export const chatMessageSchema = z.object({
  content: trimmedString(1, 10000),
});

export const phase3AnalyzeSchema = z.object({
  documentText: z.string().min(50, "Please provide at least 50 characters of text to analyze"),
});

export const visionBoardSchema = z.object({
  slot: z.enum(["main", "left", "right"]),
  imageData: z.string().max(10 * 1024 * 1024, "Image data must be at most 10MB").optional().nullable(),
});

export const checkoutSchema = z.object({
  courseType: z.enum(["phase12", "phase3", "allinone"]),
});
