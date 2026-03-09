import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, mockDashboardData, TEST_USER, todayStr } from "./helpers";

test.describe("Journal Creation", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);

    let savedJournal: Record<string, unknown> | null = null;

    await page.route("**/api/journals", (route) => {
      if (route.request().method() === "POST") {
        savedJournal = { id: 1, userId: TEST_USER.id, ...route.request().postDataJSON() };
        return route.fulfill({ json: savedJournal });
      }
      return route.fulfill({ json: savedJournal ? [savedJournal] : [] });
    });

    await page.route(`**/api/journals/${todayStr}/morning`, (route) =>
      route.fulfill({ json: savedJournal }),
    );

    await page.route(`**/api/journals/${todayStr}/evening`, (route) =>
      route.fulfill({ json: null }),
    );

    // Stub other dashboard routes so navigation works
    await mockDashboardData(page);
  });

  test("morning journal page loads with correct fields", async ({ page }) => {
    await page.goto(`/journal/${todayStr}/morning`);

    await expect(page.getByTestId("card-check-in")).toBeVisible();
    await expect(page.getByTestId("input-sleep-hours")).toBeVisible();
    await expect(page.getByTestId("card-self-awareness")).toBeVisible();
    await expect(page.getByTestId("input-intention")).toBeVisible();
    await expect(page.getByTestId("card-happiness")).toBeVisible();
    await expect(page.getByTestId("input-gratitude")).toBeVisible();
  });

  test("energy and stress level buttons are clickable", async ({ page }) => {
    await page.goto(`/journal/${todayStr}/morning`);

    // Set energy level
    await page.getByTestId("button-energy-3").click();
    await expect(page.getByTestId("button-energy-3")).toHaveAttribute("data-active", "true");

    // Set stress level
    await page.getByTestId("button-stress-2").click();
    await expect(page.getByTestId("button-stress-2")).toHaveAttribute("data-active", "true");
  });

  test("can fill and save a morning journal", async ({ page }) => {
    await page.goto(`/journal/${todayStr}/morning`);

    await page.getByTestId("input-sleep-hours").fill("7");
    await page.getByTestId("button-energy-3").click();
    await page.getByTestId("button-stress-1").click();

    await page.getByTestId("input-intention").fill("Practice patience today");
    await page.getByTestId("input-gratitude").fill("Grateful for morning coffee");
    await page.getByTestId("input-joy").fill("Lunch with a friend");

    // Save
    const saveRequest = page.waitForRequest("**/api/journals");
    await page.getByTestId("button-save").click();
    const req = await saveRequest;

    expect(req.method()).toBe("POST");
    const body = req.postDataJSON();
    expect(body.date).toBe(todayStr);
    expect(body.session).toBe("morning");
  });

  test("courage card fields are present", async ({ page }) => {
    await page.goto(`/journal/${todayStr}/morning`);

    await expect(page.getByTestId("card-courage")).toBeVisible();
    await expect(page.getByTestId("input-avoidance")).toBeVisible();
    await expect(page.getByTestId("input-courage-action")).toBeVisible();
  });

  test("mode toggle switches between quick and deep", async ({ page }) => {
    await page.goto(`/journal/${todayStr}/morning`);

    await expect(page.getByTestId("mode-toggle")).toBeVisible();
    await page.getByTestId("button-mode-deep").click();

    // Deep mode should show additional fields like release card
    await expect(page.getByTestId("card-release")).toBeVisible();
    await expect(page.getByTestId("input-stress")).toBeVisible();
  });

  test("evening journal shows different fields", async ({ page }) => {
    await page.route(`**/api/journals/${todayStr}/evening`, (route) =>
      route.fulfill({ json: null }),
    );

    await page.goto(`/journal/${todayStr}/evening`);

    await expect(page.getByTestId("card-win-of-the-day")).toBeVisible();
    await expect(page.getByTestId("input-win-of-the-day")).toBeVisible();
    await expect(page.getByTestId("card-shutdown")).toBeVisible();
    await expect(page.getByTestId("input-shutdown-enough")).toBeVisible();
    await expect(page.getByTestId("input-shutdown-tomorrow")).toBeVisible();
  });

  test("can save an evening journal", async ({ page }) => {
    await page.route(`**/api/journals/${todayStr}/evening`, (route) =>
      route.fulfill({ json: null }),
    );

    await page.goto(`/journal/${todayStr}/evening`);

    await page.getByTestId("input-win-of-the-day").fill("Completed a hard task");
    await page.getByTestId("input-shutdown-enough").fill("I did my best today");
    await page.getByTestId("input-shutdown-tomorrow").fill("Review project plan");

    const saveRequest = page.waitForRequest("**/api/journals");
    await page.getByTestId("button-save").click();
    const req = await saveRequest;

    expect(req.method()).toBe("POST");
    const body = req.postDataJSON();
    expect(body.session).toBe("evening");
  });

  test("journal buttons appear on dashboard", async ({ page }) => {
    await mockDashboardData(page, { journals: [] });
    await page.goto("/");

    // Morning button should show when no morning journal exists
    await expect(page.getByTestId("button-morning-journal")).toBeVisible();
  });
});
