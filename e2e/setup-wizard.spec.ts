import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser, TEST_USER, currentMonth } from "./helpers";

test.describe("Setup Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page, {
      onboardingComplete: false,
      onboardingStep: 0,
    });

    // Mock APIs that the wizard reads/writes
    let savedIdentity: Record<string, string> = {};
    await page.route("**/api/identity-document", (route) => {
      if (route.request().method() === "PUT") {
        savedIdentity = { ...savedIdentity, ...route.request().postDataJSON() };
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...savedIdentity } });
      }
      return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...savedIdentity } });
    });

    await page.route("**/api/annual-commitment", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...route.request().postDataJSON(), isActive: true } });
      }
      if (route.request().method() === "PUT") {
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...route.request().postDataJSON() } });
      }
      return route.fulfill({ json: null });
    });

    await page.route("**/api/annual-commitment/**", (route) => {
      return route.fulfill({ json: { id: 1, userId: TEST_USER.id, isActive: true } });
    });

    await page.route("**/api/pattern-profile", (route) => {
      if (route.request().method() === "PATCH" || route.request().method() === "PUT") {
        return route.fulfill({ json: { id: 1, userId: TEST_USER.id, ...route.request().postDataJSON() } });
      }
      return route.fulfill({ json: { id: 0, userId: TEST_USER.id } });
    });

    await page.route("**/api/habits", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ json: { id: 1, ...route.request().postDataJSON(), active: true } });
      }
      return route.fulfill({ json: [] });
    });

    await page.route("**/api/habits/**", (route) => {
      return route.fulfill({ json: { id: 1, active: true } });
    });

    let activeSprint: any = null;
    await page.route("**/api/goal-sprint", (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        activeSprint = { id: 1, userId: TEST_USER.id, monthKey: body.startDate, sprintStatus: "active", ...body };
        return route.fulfill({ status: 201, json: activeSprint });
      }
      return route.fulfill({ json: activeSprint });
    });
    await page.route("**/api/goal-sprints", (route) => {
      return route.fulfill({ json: activeSprint ? [activeSprint] : [] });
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
          json: { onboardingStep, onboardingComplete: onboardingStep >= 6 },
        });
      }
      return route.fulfill({
        json: { onboardingStep, onboardingComplete: onboardingStep >= 6 },
      });
    });
  });

  test("displays welcome step with all 6 preview items", async ({ page }) => {
    await page.goto("/setup");

    await expect(page.getByTestId("text-welcome-heading")).toBeVisible();
    await expect(page.getByTestId("text-welcome-subtext")).toBeVisible();
    await expect(page.getByTestId("button-begin")).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId(`text-step-preview-${i}`)).toBeVisible();
    }
  });

  test("skip-setup button no longer exists on welcome step", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByTestId("button-begin")).toBeVisible();
    await expect(page.getByTestId("link-skip-setup")).toHaveCount(0);
  });

  test("Step 1: Core Identity fields are visible", async ({ page }) => {
    await page.goto("/setup");

    await page.getByTestId("button-begin").click();

    await expect(page.getByTestId("text-step-heading")).toBeVisible();
    await expect(page.getByTestId("input-value-0")).toBeVisible();
    await expect(page.getByTestId("input-value-why-0")).toBeVisible();
    await expect(page.getByTestId("input-identity-statement")).toBeVisible();
    await expect(page.getByTestId("input-vision")).toBeVisible();
    await expect(page.getByTestId("input-purpose")).toBeVisible();
  });

  test("back button navigates to previous step", async ({ page }) => {
    await page.goto("/setup");
    await page.getByTestId("button-begin").click();

    // On step 1 — fill a value and go next
    await page.getByTestId("input-value-0").fill("Courage");
    await page.getByTestId("button-next").click();

    // On step 2 — go back
    await page.getByTestId("button-back").click();

    // Should be back on welcome (step 0)
    await expect(page.getByTestId("button-begin")).toBeVisible();
  });

  test("progress bar is visible during setup", async ({ page }) => {
    await page.goto("/setup");
    await page.getByTestId("button-begin").click();

    await expect(page.getByTestId("progress-bar")).toBeVisible();
  });
});
