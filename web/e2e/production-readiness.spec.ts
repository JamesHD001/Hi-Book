import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const email = process.env.E2E_TEST_EMAIL!;
const password = process.env.E2E_TEST_PASSWORD!;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
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
      ["/community", "Your community"],
      ["/discover", "Meet someone new."],
      ["/messages", "Your conversations"],
      ["/notifications", "Notifications"],
      ["/profile", "Make your profile yours."],
    ] as const;

    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
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
            const associatedLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() : "";
            return !ariaLabel && !ariaLabelledBy && !associatedLabel;
          })
          .map((control) => control.outerHTML.slice(0, 240)),
      );
      expect(unnamedFormControls, `Unnamed form controls found on ${path}`).toEqual([]);

      const imagesWithoutAlt = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => !image.hasAttribute("alt"))
          .map((image) => image.outerHTML.slice(0, 240)),
      );
      expect(imagesWithoutAlt, `Images without alt attributes found on ${path}`).toEqual([]);
    }
  });
});
