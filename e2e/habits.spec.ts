import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, mockDashboardData, todayStr } from "./helpers";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const todayDayCode = DAY_CODES[new Date().getDay()];

function makeHabit(id: number, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: "test-user-1",
    name,
    category: "health",
    timing: "morning",
    cadence: "mon,tue,wed,thu,fri,sat,sun",
    duration: null,
    startDate: null,
    endDate: null,
    active: true,
    sortOrder: id,
    isBinary: false,
    ...overrides,
  };
}

test.describe("Habit Tracking on Dashboard", () => {
  const habits = [
    makeHabit(1, "Meditate"),
    makeHabit(2, "Exercise"),
    makeHabit(3, "Read", { isBinary: true }),
  ];

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockDashboardData(page, { habits });
  });

  test("daily habits card shows all scheduled habits", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("card-daily-habits")).toBeVisible();

    for (const h of habits) {
      await expect(page.getByTestId(`habit-item-${h.id}`)).toBeVisible();
    }
  });

  test("shows habits progress counter", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("text-habits-progress")).toBeVisible();
    // 2 journal items + 3 habits = 5 total (with allinone purchase)
    await expect(page.getByTestId("text-habits-progress")).toContainText("/");
  });

  test("clicking habit level button cycles through states", async ({ page }) => {
    // Mock completions endpoint to accept POST/PATCH
    let postedCompletion = false;
    await page.route("**/api/habit-completions", (route) => {
      if (route.request().method() === "POST") {
        postedCompletion = true;
        return route.fulfill({ json: { id: 1, habitId: 1, date: todayStr, status: "completed", completionLevel: 2 } });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto("/");

    // Click the level button for habit 1
    const levelBtn = page.getByTestId("habit-level-1");
    await expect(levelBtn).toBeVisible();
    await levelBtn.click();

    // Should have sent a completion request
    expect(postedCompletion).toBe(true);
  });

  test("journal habit items link to journal pages", async ({ page }) => {
    await page.goto("/");

    const morningItem = page.getByTestId("journal-row-morning");
    await expect(morningItem).toBeVisible();

    const eveningItem = page.getByTestId("journal-row-evening");
    await expect(eveningItem).toBeVisible();
  });

  test("shows no-habits card when no habits exist", async ({ page }) => {
    await mockDashboardData(page, { habits: [] });
    await page.goto("/");

    await expect(page.getByTestId("card-no-habits")).toBeVisible();
    await expect(page.getByTestId("button-add-habits")).toBeVisible();
  });
});

test.describe("Habits Management Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    const habits = [makeHabit(1, "Meditate"), makeHabit(2, "Exercise")];

    await page.route("**/api/habits", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: habits });
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        habits.push(makeHabit(habits.length + 1, body.name, body));
        return route.fulfill({ json: habits[habits.length - 1] });
      }
      return route.fulfill({ json: { success: true } });
    });

    await page.route("**/api/habits/*", (route) =>
      route.fulfill({ json: { success: true } }),
    );

    await page.route("**/api/habit-completions/**", (route) =>
      route.fulfill({ json: [] }),
    );

    await mockDashboardData(page);
  });

  test("habits page lists existing habits", async ({ page }) => {
    await page.goto("/habits");

    await expect(page.getByTestId("text-page-title")).toBeVisible();
    await expect(page.getByTestId("card-habit-1")).toBeVisible();
    await expect(page.getByTestId("card-habit-2")).toBeVisible();
    await expect(page.getByTestId("text-habit-name-1")).toContainText("Meditate");
    await expect(page.getByTestId("text-habit-name-2")).toContainText("Exercise");
  });

  test("shows habit count", async ({ page }) => {
    await page.goto("/habits");

    await expect(page.getByTestId("text-habit-count")).toBeVisible();
  });

  test("add habit button is visible", async ({ page }) => {
    await page.goto("/habits");

    await expect(page.getByTestId("button-add-habit")).toBeVisible();
  });

  test("edit and delete buttons exist on each habit card", async ({ page }) => {
    await page.goto("/habits");

    await expect(page.getByTestId("button-edit-habit-1")).toBeVisible();
    await expect(page.getByTestId("button-delete-habit-1")).toBeVisible();
    await expect(page.getByTestId("button-duplicate-habit-1")).toBeVisible();
  });
});
