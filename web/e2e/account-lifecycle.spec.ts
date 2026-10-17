import { test, expect, request } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const userA = { email: process.env.E2E_TEST_EMAIL!, password: process.env.E2E_TEST_PASSWORD! };
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const adminKey = process.env.E2E_ADMIN_KEY;
const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "e2e/.fixture.json"), "utf8")) as {
  users: { id: string; email: string }[];
};
const fixtureUserA = fixture.users.find((user) => user.email === userA.email);

test.describe("account lifecycle", () => {
  test.skip(!userA.email || !userA.password, "E2E credentials are not configured.");

  test("user can schedule, enter restricted grace state, and cancel account deletion through the real UI", async ({ page }) => {
    test.setTimeout(30_000);

    await page.goto("/login");
    await page.getByLabel("Email").fill(userA.email);
    await page.locator('input[autocomplete="current-password"]').fill(userA.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/community(?:\/)?$/);

    await page.goto("/account-deletion");
    const existingCancel = page.getByRole("button", { name: "Cancel deletion request" });
    if (await existingCancel.count()) {
      await existingCancel.click();
      await expect(page.getByRole("status")).toHaveText(/cancelled/i);
    }

    await page.goto("/profile");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Schedule account deletion" }).click();
    await expect(page.getByRole("status")).toHaveText(/scheduled for deletion/i);

    await page.goto("/community");
    await expect(page).toHaveURL(/\/onboarding(?:\/)?$/);

    await page.goto("/account-deletion");
    await expect(page.getByText(/^Scheduled for /i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel deletion request" }).click();
    await expect(page.getByRole("status")).toHaveText(/cancelled.*active again/i);

    await page.goto("/community");
    await expect(page).toHaveURL(/\/community(?:\/)?$/);
    await expect(page.getByRole("heading", { name: /Welcome,/i })).toBeVisible();
  });

  test("expired deletion permanently restricts the account in the browser", async ({ page }) => {
    test.skip(!adminKey || !fixtureUserA, "The local Supabase admin fixture is not configured.");
    test.setTimeout(45_000);

    if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(supabaseUrl)) {
      throw new Error("Account-deletion E2E tests must use local Supabase.");
    }

    const api = await request.newContext({
      extraHTTPHeaders: {
        apikey: adminKey!,
        Authorization: `Bearer ${adminKey!}`,
      },
    });

    try {
      await page.goto("/login");
      await page.getByLabel("Email").fill(userA.email);
      await page.locator('input[autocomplete="current-password"]').fill(userA.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/community(?:\/)?$/);

      await page.goto("/account-deletion");
      const existingCancel = page.getByRole("button", { name: "Cancel deletion request" });
      if (await existingCancel.count()) {
        await existingCancel.click();
        await expect(page.getByRole("status")).toHaveText(/cancelled/i);
      }

      await page.goto("/profile");
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: "Schedule account deletion" }).click();
      await expect(page.getByRole("status")).toHaveText(/scheduled for deletion/i);

      const dueRequest = await api.patch(
        `${supabaseUrl}/rest/v1/account_deletion_request?user_id=eq.${fixtureUserA!.id}&status=eq.SCHEDULED`,
        {
          data: { scheduled_for: new Date(Date.now() - 60_000).toISOString() },
          headers: { Prefer: "return=representation" },
        },
      );
      if (!dueRequest.ok()) {
        throw new Error(`Could not expire the local E2E deletion request: ${dueRequest.status()} ${await dueRequest.text()}`);
      }
      expect(await dueRequest.json()).toHaveLength(1);

      const completion = await api.post(`${supabaseUrl}/rest/v1/rpc/process_due_account_deletions`, { data: {} });
      if (!completion.ok()) {
        throw new Error(`Could not run the local deletion worker: ${completion.status()} ${await completion.text()}`);
      }
      expect(await completion.json()).toBe(1);

      const account = await api.get(
        `${supabaseUrl}/rest/v1/users?id=eq.${fixtureUserA!.id}&select=account_status,deleted_at`,
      );
      if (!account.ok()) {
        throw new Error(`Could not verify the expired E2E account: ${account.status()} ${await account.text()}`);
      }
      await expect(account.json()).resolves.toEqual([
        expect.objectContaining({ account_status: "DELETED", deleted_at: expect.any(String) }),
      ]);

      await page.goto("/community");
      await expect(page).toHaveURL(/\/onboarding(?:\/)?$/);
      await expect(page.getByRole("heading", { name: "Finish setting up your account." })).toBeVisible();

      await page.goto("/profile");
      await expect(page).toHaveURL(/\/onboarding(?:\/)?$/);
    } finally {
      try {
        const restore = await api.patch(
          `${supabaseUrl}/rest/v1/users?id=eq.${fixtureUserA!.id}`,
          {
            data: { account_status: "ACTIVE", deleted_at: null },
            headers: { Prefer: "return=representation" },
          },
        );
        if (!restore.ok()) {
          throw new Error(`Could not restore the local E2E account fixture: ${restore.status()} ${await restore.text()}`);
        }
        await expect(restore.json()).resolves.toEqual([
          expect.objectContaining({ account_status: "ACTIVE", deleted_at: null }),
        ]);
      } finally {
        await api.dispose();
      }
    }
  });
});
