/**
 * Cross-user isolation tests.
 *
 * Verifies: User A cannot read, update, delete, or export User B's data.
 * Uses in-memory storage mock — no database needed.
 *
 * Test flow per domain:
 *   1. User A creates a resource
 *   2. User B tries to read/list → should NOT see User A's resource
 *   3. User B tries to update User A's resource by ID → 403
 *   4. User B tries to delete User A's resource by ID → 403
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createTestApp, asUser, resetStorage, USER_A, USER_B } from "./test-app";
import type { Express } from "express";

let app: Express;

beforeAll(() => {
  app = createTestApp();
});

beforeEach(() => {
  resetStorage();
});

// ──────────────────────────────────────────────
// HABITS
// ──────────────────────────────────────────────
describe("Habits isolation", () => {
  it("User A creates a habit, User B cannot see it", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Meditation", cadence: "mon,wed,fri", category: "health" });
    expect(create.status).toBe(200);
    const habitIdA = create.body.id;

    const list = await asUser(app, USER_B).get("/api/habits");
    expect(list.status).toBe(200);
    expect(list.body.map((h: any) => h.id)).not.toContain(habitIdA);
  });

  it("User B cannot update User A's habit", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Reading", cadence: "mon,tue", category: "health" });
    const habitIdA = create.body.id;

    const res = await asUser(app, USER_B)
      .patch(`/api/habits/${habitIdA}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("User B cannot delete User A's habit", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Exercise", cadence: "mon", category: "health" });
    const habitIdA = create.body.id;

    const res = await asUser(app, USER_B).delete(`/api/habits/${habitIdA}`);
    expect(res.status).toBe(403);
  });

  it("User B cannot version User A's habit", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Writing", cadence: "mon", category: "health" });
    const habitIdA = create.body.id;

    const res = await asUser(app, USER_B)
      .post(`/api/habits/${habitIdA}/new-version`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("User A sees only their own habits, not User B's", async () => {
    await asUser(app, USER_A).post("/api/habits").send({ name: "Habit A", cadence: "mon", category: "health" });
    await asUser(app, USER_B).post("/api/habits").send({ name: "Habit B", cadence: "mon", category: "health" });

    const listA = await asUser(app, USER_A).get("/api/habits");
    const listB = await asUser(app, USER_B).get("/api/habits");

    expect(listA.body).toHaveLength(1);
    expect(listA.body[0].name).toBe("Habit A");
    expect(listB.body).toHaveLength(1);
    expect(listB.body[0].name).toBe("Habit B");
  });
});

// ──────────────────────────────────────────────
// HABIT COMPLETIONS
// ──────────────────────────────────────────────
describe("Habit completions isolation", () => {
  const testDate = "2026-01-05";

  it("User B cannot see User A's completions", async () => {
    const hRes = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Completions Test", cadence: "mon,tue,wed,thu,fri,sat,sun", category: "health" });
    const habitIdA = hRes.body.id;

    await asUser(app, USER_A)
      .post("/api/habit-completions")
      .send({ habitId: habitIdA, date: testDate, status: "completed", completionLevel: 2 });

    const res = await asUser(app, USER_B).get(`/api/habit-completions/${testDate}`);
    expect(res.status).toBe(200);
    expect(res.body.map((c: any) => c.habitId)).not.toContain(habitIdA);
  });

  it("User B cannot create a completion for User A's habit", async () => {
    const hRes = await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "Protected Habit", cadence: "mon", category: "health" });
    const habitIdA = hRes.body.id;

    const res = await asUser(app, USER_B)
      .post("/api/habit-completions")
      .send({ habitId: habitIdA, date: testDate, status: "completed", completionLevel: 2 });
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────
// EISENHOWER ENTRIES
// ──────────────────────────────────────────────
describe("Eisenhower isolation", () => {
  it("User B cannot see User A's entries", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/eisenhower")
      .send({ task: "Secret Task", weekStart: "2026-01-05", quadrant: "q1", role: "health" });
    expect(create.status).toBe(200);
    const entryIdA = create.body.id;

    const list = await asUser(app, USER_B).get("/api/eisenhower");
    expect(list.status).toBe(200);
    expect(list.body.map((e: any) => e.id)).not.toContain(entryIdA);
  });

  it("User B cannot update User A's entry", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/eisenhower")
      .send({ task: "My Task", weekStart: "2026-01-05", quadrant: "q1", role: "health" });
    const entryIdA = create.body.id;

    const res = await asUser(app, USER_B)
      .patch(`/api/eisenhower/${entryIdA}`)
      .send({ task: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("User B cannot delete User A's entry", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/eisenhower")
      .send({ task: "Important Task", weekStart: "2026-01-05", quadrant: "q2", role: "health" });
    const entryIdA = create.body.id;

    const res = await asUser(app, USER_B).delete(`/api/eisenhower/${entryIdA}`);
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────
// IDENTITY DOCUMENT
// ──────────────────────────────────────────────
describe("Identity document isolation", () => {
  it("User B cannot see User A's identity document", async () => {
    await asUser(app, USER_A)
      .put("/api/identity-document")
      .send({ identity: "Secret Identity A", vision: "Secret", values: "Secret" });

    const res = await asUser(app, USER_B).get("/api/identity-document");
    expect(res.status).toBe(200);
    expect(res.body.identity).not.toBe("Secret Identity A");
  });
});

// ──────────────────────────────────────────────
// TOOL USAGE LOGS
// ──────────────────────────────────────────────
describe("Tool usage isolation", () => {
  it("User B cannot see User A's tool usage", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/tool-usage")
      .send({ toolName: "secret-tool", date: "2026-01-05", moodBefore: 3, emotionBefore: "neutral", completed: true });
    expect(create.status).toBe(200);
    const logIdA = create.body.id;

    const list = await asUser(app, USER_B).get("/api/tool-usage");
    expect(list.status).toBe(200);
    expect(list.body.map((l: any) => l.id)).not.toContain(logIdA);
  });

  it("User B cannot update User A's tool usage log", async () => {
    const create = await asUser(app, USER_A)
      .post("/api/tool-usage")
      .send({ toolName: "tool", date: "2026-01-05", moodBefore: 3, emotionBefore: "neutral", completed: true });
    const logIdA = create.body.id;

    const res = await asUser(app, USER_B)
      .patch(`/api/tool-usage/${logIdA}`)
      .send({ moodAfter: 5 });
    // Route returns 404 when log doesn't belong to user (not in their list)
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────
// EXPORT ENDPOINTS
// ──────────────────────────────────────────────
describe("Export isolation", () => {
  it("User B's full export does not contain User A's data", async () => {
    await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "ExportIsolationMarker", cadence: "mon", category: "health" });

    const exportRes = await asUser(app, USER_B).get("/api/export-all");
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).not.toContain("ExportIsolationMarker");
  });

  it("User A's export contains their own data", async () => {
    await asUser(app, USER_A)
      .post("/api/habits")
      .send({ name: "MyOwnHabit", cadence: "mon", category: "health" });

    const exportRes = await asUser(app, USER_A).get("/api/export-all");
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).toContain("MyOwnHabit");
  });
});

// ──────────────────────────────────────────────
// UNAUTHENTICATED ACCESS
// ──────────────────────────────────────────────
describe("Unauthenticated requests are rejected", () => {
  const endpoints = [
    ["GET", "/api/habits"],
    ["GET", "/api/eisenhower"],
    ["GET", "/api/identity-document"],
    ["GET", "/api/tool-usage"],
    ["GET", "/api/export-all"],
    ["POST", "/api/habits"],
    ["POST", "/api/eisenhower"],
    ["DELETE", "/api/habits/1"],
    ["DELETE", "/api/eisenhower/1"],
  ] as const;

  for (const [method, url] of endpoints) {
    it(`${method} ${url} returns 401 without auth`, async () => {
      const req = (await import("supertest")).default(app);
      let res;
      switch (method) {
        case "GET": res = await req.get(url); break;
        case "POST": res = await req.post(url).send({}); break;
        case "DELETE": res = await req.delete(url); break;
      }
      expect(res!.status).toBe(401);
    });
  }
});
