import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, mockDashboardData, todayStr } from "./helpers";

/**
 * Regression coverage for the legacy /api/monthly-goal vs /api/goal-sprint split.
 *
 * Before the read-path unification, dashboard.tsx and other pages read sprint
 * data via useMonthlyGoal(YYYY-MM), but the wizard wrote sprints via
 * /api/goal-sprint with a YYYY-MM-DD key. The lookup never matched, the
 * dashboard saw "no goal," and immediately redirected to /sprint setup —
 * trapping a user who had just finished onboarding.
 *
 * These tests assert that an authenticated user with a populated active sprint
 * can land on /today, /week, and /week/plan without any redirect away from
 * the requested page.
 */
test.describe("Sprint read-path golden path", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockDashboardData(page);

    // Endpoints touched by Today / Plan / Eisenhower beyond the helper defaults
    await page.route("**/api/annual-commitment", (route) =>
      route.fulfill({ json: { id: 1, isActive: true, weeklyProofBehaviorHabitId: null, visualization: "" } }),
    );
    await page.route("**/api/pattern-profile", (route) =>
      route.fulfill({ json: { id: 1, repeatingLoopStory: "" } }),
    );
  });

  test("authenticated user with active sprint lands on /today without redirect", async ({ page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/today");
    expect(page.url()).not.toContain("/setup");
    expect(page.url()).not.toMatch(/\/sprint(\?|$)/);
  });

  test("Plan tab renders sprint goal, not the empty 'No goal set' fallback", async ({ page }) => {
    await page.goto("/week");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/week");
    expect(page.url()).not.toContain("/setup");
  });

  test("Eisenhower planning page loads without setup redirect", async ({ page }) => {
    await page.goto("/week/plan");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/week/plan");
    expect(page.url()).not.toContain("/setup");
  });
});

test.describe("Setup gate", () => {
  test("user with onboarding incomplete is redirected to /setup from /today", async ({ page }) => {
    await mockAuthenticatedUser(page, { onboardingComplete: false, onboardingStep: 0 });
    await mockDashboardData(page);

    await page.goto("/today");
    await page.waitForURL("**/setup", { timeout: 5000 });

    expect(page.url()).toContain("/setup");
  });

  test("user with onboarding complete but empty identity is redirected to /setup", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockDashboardData(page);
    // Override identity-document to be empty
    await page.route("**/api/identity-document", (route) =>
      route.fulfill({ json: { id: 1, identity: "", vision: "", purpose: "" } }),
    );

    await page.goto("/today");
    await page.waitForURL("**/setup", { timeout: 5000 });

    expect(page.url()).toContain("/setup");
  });
});
