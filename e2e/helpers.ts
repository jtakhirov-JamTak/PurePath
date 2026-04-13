import { Page } from "@playwright/test";
import { format, addDays } from "date-fns";

/** Mock user returned by /api/auth/user */
export const TEST_USER = {
  id: "test-user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profileImageUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const todayStr = format(new Date(), "yyyy-MM-dd");
export const currentMonth = format(new Date(), "yyyy-MM");

/**
 * Sets up API route mocking so the app thinks we are authenticated
 * and have purchased courses. Call before navigating to any page.
 */
export async function mockAuthenticatedUser(page: Page, opts: {
  onboardingComplete?: boolean;
  onboardingStep?: number;
  hasPurchases?: boolean;
} = {}) {
  const {
    onboardingComplete = true,
    onboardingStep = 6,
    hasPurchases = true,
  } = opts;

  // Auth
  await page.route("**/api/auth/user", (route) =>
    route.fulfill({ json: TEST_USER }),
  );

  // Onboarding
  await page.route("**/api/onboarding", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { onboardingStep, onboardingComplete } });
    }
    // PATCH — advance step
    return route.fulfill({ json: { onboardingStep: onboardingStep + 1, onboardingComplete: true } });
  });

  // Access status
  await page.route("**/api/access-status", (route) =>
    route.fulfill({ json: { hasAccess: hasPurchases } }),
  );

  // Purchases (legacy — kept for backward compat)
  const purchases = hasPurchases
    ? [{ id: 1, userId: TEST_USER.id, courseType: "allinone", amount: 0, status: "completed", createdAt: new Date().toISOString() }]
    : [];
  await page.route("**/api/purchases", (route) =>
    route.fulfill({ json: purchases }),
  );

  // Active sprint (populated — no redirect)
  const sprintStart = todayStr;
  const sprintEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");
  await page.route(`**/api/goal-sprint`, (route) =>
    route.fulfill({ json: { id: 1, userId: TEST_USER.id, monthKey: sprintStart, goalStatement: "Stay consistent", sprintName: "Test Sprint", startDate: sprintStart, endDate: sprintEnd, sprintStatus: "active" } }),
  );
  await page.route(`**/api/goal-sprints`, (route) =>
    route.fulfill({ json: [] }),
  );

  // Identity document
  await page.route("**/api/identity-document", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { id: 1, userId: TEST_USER.id, identity: "Test identity", vision: "Test vision", purpose: "Test purpose", values: "Courage,Growth", othersWillSee: "Kindness", beYourself: "" } });
    }
    return route.fulfill({ json: { success: true } });
  });
}

/** Stubs out the standard dashboard data queries with empty/minimal data. */
export async function mockDashboardData(page: Page, overrides: {
  habits?: unknown[];
  habitCompletions?: unknown[];
  journals?: unknown[];
  eisenhowerEntries?: unknown[];
  customTools?: unknown[];
} = {}) {
  const {
    habits = [],
    habitCompletions = [],
    journals = [],
    eisenhowerEntries = [],
    customTools = [],
  } = overrides;

  await page.route("**/api/habits", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: habits });
    }
    return route.fulfill({ json: { id: 99, name: "New Habit", ...route.request().postDataJSON() } });
  });

  await page.route("**/api/habit-completions/**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: habitCompletions });
    }
    return route.fulfill({ json: { success: true } });
  });

  await page.route("**/api/habit-completions", (route) =>
    route.fulfill({ json: { success: true } }),
  );

  await page.route("**/api/journals", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: journals });
    }
    return route.fulfill({ json: { id: 1, ...route.request().postDataJSON() } });
  });

  await page.route("**/api/journals/**", (route) =>
    route.fulfill({ json: null }),
  );

  await page.route("**/api/eisenhower", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: eisenhowerEntries });
    }
    return route.fulfill({ json: { success: true } });
  });

  await page.route("**/api/eisenhower/**", (route) =>
    route.fulfill({ json: { success: true } }),
  );

  await page.route("**/api/custom-tools", (route) =>
    route.fulfill({ json: customTools }),
  );

  await page.route("**/api/avoidance-logs", (route) =>
    route.fulfill({ json: { success: true } }),
  );
}
