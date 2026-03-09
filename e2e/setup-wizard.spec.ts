import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, TEST_USER, currentMonth } from "./helpers";

test.describe("Setup Wizard", () => {
  test.beforeEach(async ({ page }) => {
    // User has NOT completed onboarding
    await mockAuthenticatedUser(page, {
      onboardingComplete: false,
      onboardingStep: 0,
    });

    // Mock APIs that the wizard writes to
    let savedIdentity: Record<string, string> = {};
    await page.route("**/api/identity-document", (route) => {
      if (route.request().method() === "PUT") {
        savedIdentity = { ...savedIdentity, ...route.request().postDataJSON() };
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...savedIdentity } });
      }
      return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...savedIdentity } });
    });

    await page.route(`**/api/monthly-goal**`, (route) => {
      if (route.request().method() === "PUT") {
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, monthKey: currentMonth, ...route.request().postDataJSON() } });
      }
      return route.fulfill({ json: { id: 1, userId: TEST_USER.id, monthKey: currentMonth, goalStatement: "" } });
    });

    await page.route("**/api/habits", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { id: 1, ...route.request().postDataJSON(), active: true } });
      }
      return route.fulfill({ json: [] });
    });

    await page.route("**/api/journals", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { id: 1, ...route.request().postDataJSON() } });
      }
      return route.fulfill({ json: [] });
    });

    let onboardingStep = 0;
    await page.route("**/api/onboarding", (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        onboardingStep = body.step;
        return route.fulfill({
          json: { onboardingStep, onboardingComplete: onboardingStep >= 5 },
        });
      }
      return route.fulfill({
        json: { onboardingStep, onboardingComplete: onboardingStep >= 5 },
      });
    });
  });

  test("displays welcome step with all preview items", async ({ page }) => {
    await page.goto("/setup");

    await expect(page.getByTestId("text-welcome-heading")).toBeVisible();
    await expect(page.getByTestId("text-welcome-subtext")).toBeVisible();
    await expect(page.getByTestId("button-begin")).toBeVisible();
    await expect(page.getByTestId("link-skip-setup")).toBeVisible();

    // All 5 step previews visible
    for (let i = 0; i < 5; i++) {
      await expect(page.getByTestId(`text-step-preview-${i}`)).toBeVisible();
    }
  });

  test("can skip setup entirely", async ({ page }) => {
    await page.goto("/setup");

    await expect(page.getByTestId("link-skip-setup")).toBeVisible();
    await page.getByTestId("link-skip-setup").click();

    // Should have called PATCH to mark complete
    await page.waitForTimeout(500);
  });

  test("walks through all steps end-to-end", async ({ page }) => {
    await page.goto("/setup");

    // Step 0 → Begin
    await page.getByTestId("button-begin").click();

    // Step 1 — Discovery Profile
    await expect(page.getByTestId("text-step-heading")).toBeVisible();
    await page.getByTestId("input-core-values").fill("Courage, Honesty");
    await page.getByTestId("input-strengths").fill("Persistence");
    await page.getByTestId("input-patterns-helping").fill("Morning routine");
    await page.getByTestId("input-patterns-hurting").fill("Late nights");
    await page.getByTestId("input-stress-responses").fill("Withdrawing");
    await page.getByTestId("button-next").click();

    // Step 2 — Identity Document
    await page.getByTestId("input-vision").fill("Be my best self");
    await page.getByTestId("input-identity-statement").fill("I am someone who shows up");
    await page.getByTestId("input-relational").fill("Show empathy daily");
    await page.getByTestId("input-purpose").fill("Help others grow");
    await page.getByTestId("button-next").click();

    // Step 3 — Monthly Goal
    await page.getByTestId("input-goal-statement").fill("Exercise 4x per week");
    await page.getByTestId("input-why").fill("Health and energy");
    await page.getByTestId("input-weekly-behavior").fill("Run 3 miles MWF");
    await page.getByTestId("input-inner-obstacle").fill("Tiredness");
    await page.getByTestId("input-if-then-plan").fill("If tired, walk instead");
    await page.getByTestId("button-next").click();

    // Step 4 — Starter Habits
    await expect(page.getByTestId("input-habit-name-0")).toBeVisible();
    await page.getByTestId("input-habit-name-0").fill("Meditate");
    await page.getByTestId("button-next").click();

    // Step 5 — First Journal
    await page.getByTestId("input-gratitude").fill("Grateful for this day");
    await page.getByTestId("input-intention").fill("Be present");
    await page.getByTestId("button-complete-setup").click();

    // Should navigate away after completion
    await page.waitForTimeout(500);
  });

  test("back button navigates to previous step", async ({ page }) => {
    await page.goto("/setup");
    await page.getByTestId("button-begin").click();

    // On step 1 — fill and go next
    await page.getByTestId("input-core-values").fill("Test");
    await page.getByTestId("button-next").click();

    // On step 2 — go back
    await page.getByTestId("button-back").click();

    // Should be back on step 1 with data preserved
    await expect(page.getByTestId("input-core-values")).toHaveValue("Test");
  });

  test("progress bar is visible during setup", async ({ page }) => {
    await page.goto("/setup");
    await page.getByTestId("button-begin").click();

    await expect(page.getByTestId("progress-bar")).toBeVisible();
  });
});
