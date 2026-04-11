/**
 * In-memory storage implementation for testing.
 * Mirrors the IStorage interface but uses plain arrays.
 */

let _habits: any[] = [];
let _habitCompletions: any[] = [];
let _eisenhower: any[] = [];
let _identityDocs: any[] = [];
let _patternProfiles: any[] = [];
let _toolUsage: any[] = [];
let _avoidanceLogs: any[] = [];
let _monthlyGoals: any[] = [];
let _journals: any[] = [];
let _userSettings: any[] = [];
let _weeklySummaries: any[] = [];
let _fearLogs: any[] = [];
let _workshopSeeds: any[] = [];
let _annualCommitments: any[] = [];
let _nextId = 1;

function nextId() { return _nextId++; }

export function resetStorage() {
  _habits = [];
  _habitCompletions = [];
  _eisenhower = [];
  _identityDocs = [];
  _patternProfiles = [];
  _toolUsage = [];
  _avoidanceLogs = [];
  _monthlyGoals = [];
  _journals = [];
  _userSettings = [];
  _weeklySummaries = [];
  _fearLogs = [];
  _workshopSeeds = [];
  _annualCommitments = [];
  _nextId = 1;
}

export const storage = {
  // Habits
  getHabitsByUser: async (userId: string) => _habits.filter(h => h.userId === userId),
  createHabit: async (data: any) => {
    const h = { id: nextId(), ...data, active: data.active ?? true, createdAt: new Date().toISOString(), isBinary: data.isBinary ?? false, timing: data.timing ?? "afternoon", sortOrder: 0, startDate: data.startDate ?? null, endDate: data.endDate ?? null, duration: data.duration ?? null };
    _habits.push(h);
    return h;
  },
  updateHabit: async (userId: string, id: number, data: any) => {
    const h = _habits.find(h => h.id === id && h.userId === userId);
    if (h) Object.assign(h, data);
    return h;
  },
  deleteHabit: async (userId: string, id: number) => { _habits = _habits.filter(h => !(h.id === id && h.userId === userId)); },
  versionHabit: async (userId: string, oldId: number, newData: any) => {
    const old = _habits.find(h => h.id === oldId && h.userId === userId);
    if (!old) throw new Error("Not found");
    old.active = false;
    old.endDate = new Date().toISOString().slice(0, 10);
    const newId = nextId();
    const h = { ...old, ...newData, id: newId, active: true, startDate: new Date().toISOString().slice(0, 10), endDate: null };
    _habits.push(h);
    return h;
  },

  // Habit completions
  getHabitCompletionsForDate: async (userId: string, date: string) =>
    _habitCompletions.filter(c => c.userId === userId && c.date === date),
  getHabitCompletionsForRange: async (userId: string, start: string, end: string) =>
    _habitCompletions.filter(c => c.userId === userId && c.date >= start && c.date <= end),
  createHabitCompletion: async (data: any) => {
    const c = { id: nextId(), ...data };
    _habitCompletions.push(c);
    return c;
  },
  updateHabitCompletionStatus: async (userId: string, habitId: number, date: string, status: string) => {
    const c = _habitCompletions.find(c => c.userId === userId && c.habitId === habitId && c.date === date);
    if (c) c.status = status;
  },
  updateHabitCompletionFull: async (userId: string, habitId: number, date: string, updates: any) => {
    const c = _habitCompletions.find(c => c.userId === userId && c.habitId === habitId && c.date === date);
    if (c) Object.assign(c, updates);
  },
  deleteHabitCompletion: async (userId: string, habitId: number, date: string) => {
    _habitCompletions = _habitCompletions.filter(c => !(c.userId === userId && c.habitId === habitId && c.date === date));
  },

  // Eisenhower
  getEisenhowerEntriesByUser: async (userId: string) => _eisenhower.filter(e => e.userId === userId),
  getEisenhowerEntriesForWeek: async (userId: string, weekStart: string) =>
    _eisenhower.filter(e => e.userId === userId && e.weekStart === weekStart),
  createEisenhowerEntry: async (data: any) => {
    const e = { id: nextId(), ...data, completed: false, status: null, sortOrder: 0 };
    _eisenhower.push(e);
    return e;
  },
  updateEisenhowerEntry: async (userId: string, id: number, data: any) => {
    const e = _eisenhower.find(e => e.id === id && e.userId === userId);
    if (e) Object.assign(e, data);
    return e;
  },
  deleteEisenhowerEntry: async (userId: string, id: number) => { _eisenhower = _eisenhower.filter(e => !(e.id === id && e.userId === userId)); },

  // Identity
  getIdentityDocument: async (userId: string) => _identityDocs.find(d => d.userId === userId) || null,
  upsertIdentityDocument: async (data: any) => {
    const idx = _identityDocs.findIndex(d => d.userId === data.userId);
    if (idx >= 0) { Object.assign(_identityDocs[idx], data); return _identityDocs[idx]; }
    const doc = { id: nextId(), ...data };
    _identityDocs.push(doc);
    return doc;
  },

  // Pattern Profile
  getPatternProfile: async (userId: string) => _patternProfiles.find(p => p.userId === userId) || null,
  upsertPatternProfile: async (data: any) => {
    const idx = _patternProfiles.findIndex(p => p.userId === data.userId);
    if (idx >= 0) { Object.assign(_patternProfiles[idx], data); return _patternProfiles[idx]; }
    const profile = { id: nextId(), ...data };
    _patternProfiles.push(profile);
    return profile;
  },

  // Monthly goals
  getMonthlyGoal: async (userId: string, monthKey: string) =>
    _monthlyGoals.find(g => g.userId === userId && g.monthKey === monthKey) || null,
  getMonthlyGoalsByUser: async (userId: string) =>
    _monthlyGoals.filter(g => g.userId === userId),
  upsertMonthlyGoal: async (data: any) => {
    const idx = _monthlyGoals.findIndex(g => g.userId === data.userId && g.monthKey === data.monthKey);
    if (idx >= 0) { Object.assign(_monthlyGoals[idx], data); return _monthlyGoals[idx]; }
    const g = { id: nextId(), ...data };
    _monthlyGoals.push(g);
    return g;
  },
  getActiveSprint: async (userId: string) =>
    _monthlyGoals.find(g => g.userId === userId && g.sprintStatus === "active") || undefined,
  closeSprint: async (userId: string, monthKey: string, closedAs: string) => {
    const g = _monthlyGoals.find(g => g.userId === userId && g.monthKey === monthKey && g.sprintStatus === "active");
    if (g) { g.sprintStatus = "completed"; g.closedAs = closedAs; }
    return g || undefined;
  },
  getCompactSprintSummary: async () => ({
    sprintBehaviorRate: 0, weeklyProofBehaviorRate: 0, proofMovesIntended: 0, proofMovesCompleted: 0,
  }),

  // Journals
  getJournalsByUser: async (userId: string) => _journals.filter(j => j.userId === userId),
  getJournal: async (userId: string, date: string, session: string) =>
    _journals.find(j => j.userId === userId && j.date === date && j.session === session) || null,
  createOrUpdateJournal: async (data: any) => {
    const idx = _journals.findIndex(j => j.userId === data.userId && j.date === data.date && j.session === data.session);
    if (idx >= 0) { Object.assign(_journals[idx], data); return _journals[idx]; }
    const j = { id: nextId(), ...data };
    _journals.push(j);
    return j;
  },

  // Tool usage
  getToolUsageLogsByUser: async (userId: string) => _toolUsage.filter(t => t.userId === userId),
  getToolUsageLogsForRange: async (userId: string, start: string, end: string) =>
    _toolUsage.filter(t => t.userId === userId && t.date >= start && t.date <= end),
  createToolUsageLog: async (data: any) => {
    const t = { id: nextId(), ...data };
    _toolUsage.push(t);
    return t;
  },
  updateToolUsageLog: async (userId: string, id: number, data: any) => {
    const t = _toolUsage.find(t => t.id === id && t.userId === userId);
    if (t) Object.assign(t, data);
    return t;
  },

  // Avoidance logs
  getAvoidanceLogsByUser: async (userId: string) => _avoidanceLogs.filter(a => a.userId === userId),
  createAvoidanceLog: async (data: any) => {
    const a = { id: nextId(), ...data };
    _avoidanceLogs.push(a);
    return a;
  },

  // Containment Logs
  getContainmentLogsByUser: async (userId: string) => [] as any[],
  createContainmentLog: async (data: any) => ({ id: nextId(), ...data }),

  // Trigger Logs
  getTriggerLogsByUser: async (userId: string) => [] as any[],
  createTriggerLog: async (data: any) => ({ id: nextId(), ...data }),

  // User settings / access
  getUserSettings: async (userId: string) => _userSettings.find(s => s.userId === userId) || null,
  upsertUserSettings: async (userId: string, data: any) => {
    const idx = _userSettings.findIndex(s => s.userId === userId);
    if (idx >= 0) { Object.assign(_userSettings[idx], data); return _userSettings[idx]; }
    const s = { userId, ...data };
    _userSettings.push(s);
    return s;
  },
  hasAccess: async (userId: string) => {
    const s = _userSettings.find(s => s.userId === userId);
    return s?.hasAccess === true;
  },

  // Weekly Summaries
  getWeeklySummary: async (userId: string, weekStart: string) =>
    _weeklySummaries.find(s => s.userId === userId && s.weekStart === weekStart) || null,
  upsertWeeklySummary: async (data: any) => {
    const idx = _weeklySummaries.findIndex(s => s.userId === data.userId && s.weekStart === data.weekStart);
    if (idx >= 0) { Object.assign(_weeklySummaries[idx], data); return _weeklySummaries[idx]; }
    const s = { id: nextId(), ...data };
    _weeklySummaries.push(s);
    return s;
  },
  deleteEisenhowerEntriesByGroupId: async (userId: string, groupId: string) => {
    const before = _eisenhower.length;
    _eisenhower = _eisenhower.filter(e => !(e.userId === userId && e.groupId === groupId));
    return before - _eisenhower.length;
  },
  deleteBlocksGoalEntries: async (userId: string) => {
    const before = _eisenhower.length;
    _eisenhower = _eisenhower.filter(e => !(e.userId === userId && e.blocksGoal));
    return before - _eisenhower.length;
  },
  deleteEisenhowerEntriesForWeek: async (userId: string, weekStart: string) => {
    const before = _eisenhower.length;
    _eisenhower = _eisenhower.filter(e => !(e.userId === userId && e.weekStart === weekStart));
    return before - _eisenhower.length;
  },
  commitWeek: async (userId: string, weekStart: string, items: any[], fearSummary?: any, openingData?: any) => {
    // Wipe existing
    _eisenhower = _eisenhower.filter(e => !(e.userId === userId && e.weekStart === weekStart));
    // Insert
    const entries = items.map(item => {
      const entry = { id: nextId(), userId, weekStart, ...item, completed: false, status: null };
      _eisenhower.push(entry);
      return entry;
    });
    // Upsert summary
    let summary = null;
    if (openingData || fearSummary) {
      const idx = _weeklySummaries.findIndex(s => s.userId === userId && s.weekStart === weekStart);
      const data = { userId, weekStart, ...openingData, ...fearSummary, updatedAt: new Date() };
      if (idx >= 0) { Object.assign(_weeklySummaries[idx], data); summary = _weeklySummaries[idx]; }
      else { summary = { id: nextId(), ...data }; _weeklySummaries.push(summary); }
    }
    return { entries, summary };
  },

  // Fear Logs
  getFearLogsByUser: async (userId: string) => _fearLogs.filter(f => f.userId === userId),
  createFearLog: async (data: any) => {
    const f = { id: nextId(), ...data, createdAt: new Date() };
    _fearLogs.push(f);
    return f;
  },

  // Workshop Seed
  getWorkshopSeed: async (userId: string) =>
    _workshopSeeds.find(s => s.userId === userId) || null,
  createWorkshopSeed: async (data: any) => {
    const s = { id: nextId(), ...data, createdAt: new Date() };
    _workshopSeeds.push(s);
    return s;
  },

  // Annual Commitments
  getActiveAnnualCommitment: async (userId: string) =>
    _annualCommitments.find(c => c.userId === userId && c.isActive) || null,
  createAnnualCommitment: async (data: any) => {
    const c = { id: nextId(), ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
    _annualCommitments.push(c);
    return c;
  },
  updateAnnualCommitment: async (userId: string, id: number, data: any) => {
    const c = _annualCommitments.find(c => c.id === id && c.userId === userId);
    if (c) Object.assign(c, data, { updatedAt: new Date() });
    return c;
  },
  deactivateAnnualCommitments: async (userId: string) => {
    _annualCommitments.filter(c => c.userId === userId).forEach(c => { c.isActive = false; });
  },

  checkAndFlagSprintReviewTriggers: async () => {},

  // Flag monthly goal for review
  flagMonthlyGoalForReview: async (userId: string, monthKey: string, reason: string) => {
    const g = _monthlyGoals.find(g => g.userId === userId && g.monthKey === monthKey);
    if (g) { g.needsSprintReview = true; g.needsSprintReviewReason = reason; }
    return g;
  },

  getAllUsersWithStats: async () => [],
  getUserActivityDates: async () => [],
  batchUpdateAccess: async () => {},

};
