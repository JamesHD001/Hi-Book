import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const email = process.env.E2E_TEST_EMAIL!;
const password = process.env.E2E_TEST_PASSWORD!;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/community(?:\/)?$/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

function assertFixtureConfigured() {
  if (!email || !password) return false;
  try {
    readFileSync(resolve(process.cwd(), "e2e/.fixture.json"), "utf8");
    return true;
  } catch {
    return false;
  }
}

test.describe("production readiness: responsive and accessibility", () => {
  test.skip(!assertFixtureConfigured(), "E2E fixture is not configured.");

  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("core authenticated surfaces fit a mobile viewport", async ({ page }) => {
    await signIn(page);

    const routes = [
      ["/community", /Welcome,/i],
      ["/discover", /Meet someone new\./i],
      ["/messages", /Stay close to the people who matter\./i],
      ["/notifications", /Stay in the loop\./i],
      ["/profile", /Make your profile feel like you\./i],
    ] as const;

    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test("core authenticated surfaces expose accessible names for interactive controls and images", async ({ page }) => {
    await signIn(page);

    for (const path of ["/community", "/discover", "/messages", "/notifications", "/profile"]) {
      await page.goto(path);

      const unnamedButtons = await page.locator("button").evaluateAll((buttons) =>
        buttons
          .filter((button) => {
            const label = button.getAttribute("aria-label")?.trim();
            const text = button.textContent?.trim();
            const labelledBy = button.getAttribute("aria-labelledby")?.trim();
            return !label && !text && !labelledBy;
          })
          .map((button) => button.outerHTML.slice(0, 240)),
      );
      expect(unnamedButtons, `Unnamed buttons found on ${path}`).toEqual([]);

      const unnamedFormControls = await page.locator("input, textarea, select").evaluateAll((controls) =>
        controls
          .filter((control) => {
            const id = control.getAttribute("id");
            const ariaLabel = control.getAttribute("aria-label")?.trim();
            const ariaLabelledBy = control.getAttribute("aria-labelledby")?.trim();
            const explicitLabel = id
              ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim()
              : "";
            const wrappingLabel = control.closest("label")?.textContent?.trim();
            return !ariaLabel && !ariaLabelledBy && !explicitLabel && !wrappingLabel;
          })
          .map((control) => control.outerHTML.slice(0, 240)),
      );
      expect(unnamedFormControls, `Unnamed form controls found on ${path}`).toEqual([]);

      const unnamedImages = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => !image.getAttribute("alt"))
          .map((image) => image.outerHTML.slice(0, 240)),
      );
      expect(unnamedImages, `Images without alt text found on ${path}`).toEqual([]);
    }
  });

  test("production liveness endpoint responds without authentication", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "hibook-web" });
  });
});
