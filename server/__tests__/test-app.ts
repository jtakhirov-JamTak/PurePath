/**
 * Test harness: creates an Express app with all routes registered but
 * replaces Replit OIDC auth with a mock that reads user identity from
 * a custom X-Test-User-Id header, and replaces storage with an in-memory
 * implementation so tests run without a database.
 */
import express from "express";
import { vi } from "vitest";

// vi.mock factories are hoisted — they cannot reference local variables.
// Instead they import the separate memory-storage module at runtime.

vi.mock("openai", () => ({
  default: class {
    constructor() {}
    chat = { completions: { create: async () => ({ choices: [{ message: { content: "[]" } }] }) } };
  },
}));

vi.mock("../storage", async () => {
  const mod = await import("./memory-storage");
  return { storage: mod.storage };
});

vi.mock("../replit_integrations/auth", () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    const userId = req.headers["x-test-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
      claims: {
        sub: userId,
        email: `${userId}@test.com`,
        first_name: "Test",
        last_name: "User",
      },
    };
    req.isAuthenticated = () => true;
    next();
  },
  setupAuth: async () => {},
  registerAuthRoutes: () => {},
}));

// Now import route registrars (they'll get mocked deps)
import { registerHabitRoutes } from "../routes/habits";
import { registerEisenhowerRoutes } from "../routes/eisenhower";
import { registerJournalRoutes } from "../routes/journals";
import { registerIdentityRoutes } from "../routes/identity";
import { registerPatternRoutes } from "../routes/patterns";
import { registerToolRoutes } from "../routes/tools";
import { registerExportRoutes } from "../routes/export";
import { registerWorkshopSeedRoutes } from "../routes/workshop-seed";
import { registerAnnualCommitmentRoutes } from "../routes/annual-commitment";

export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  registerHabitRoutes(app);
  registerEisenhowerRoutes(app);
  registerJournalRoutes(app);
  registerIdentityRoutes(app);
  registerPatternRoutes(app);
  registerToolRoutes(app);
  registerExportRoutes(app);
  registerWorkshopSeedRoutes(app);
  registerAnnualCommitmentRoutes(app);

  return app;
}

// Re-export resetStorage from the memory module
export { resetStorage } from "./memory-storage";

/**
 * Helper: make an authenticated request as a specific user.
 */
import request from "supertest";

export function asUser(app: express.Express, userId: string) {
  return {
    get: (url: string) => request(app).get(url).set("X-Test-User-Id", userId),
    post: (url: string) => request(app).post(url).set("X-Test-User-Id", userId),
    put: (url: string) => request(app).put(url).set("X-Test-User-Id", userId),
    patch: (url: string) => request(app).patch(url).set("X-Test-User-Id", userId),
    delete: (url: string) => request(app).delete(url).set("X-Test-User-Id", userId),
  };
}

// Two test user IDs
export const USER_A = "test-user-isolation-a";
export const USER_B = "test-user-isolation-b";
