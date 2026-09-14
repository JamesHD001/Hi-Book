import { test, expect } from "@playwright/test";

const userA = { email: process.env.E2E_TEST_EMAIL!, password: process.env.E2E_TEST_PASSWORD! };

test.describe("account lifecycle", () => {
  test.skip(!userA.email || !userA.password, "E2E credentials are not configured.");

  test("user can schedule and cancel account deletion through the real UI", async ({ page }) => {
    test.setTimeout(30_000);

    await page.goto("/login");
    await page.getByLabel("Email").fill(userA.email);
    await page.getByLabel("Password").fill(userA.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/community(?:\/)?$/);

    await page.goto("/account-deletion");
    const existingCancel = page.getByRole("button", { name: "Cancel deletion request" });
    if (await existingCancel.count()) {
      await existingCancel.click();
      await expect(page.getByRole("status")).toHaveText(/cancelled/i);
    }

    await page.goto("/profile");
    await page.getByRole("button", { name: "Schedule account deletion" }).click();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Schedule account deletion" }).click();
    await expect(page.getByRole("status")).toHaveText(/scheduled for deletion/i);

    await page.goto("/account-deletion");
    await expect(page.getByText(/scheduled for/i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel deletion request" }).click();
    await expect(page.getByRole("status")).toHaveText(/cancelled.*active again/i);

    await page.goto("/community");
    await expect(page.getByRole("heading", { name: /Welcome,/i })).toBeVisible();
  });
});
