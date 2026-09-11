import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const email = process.env.E2E_TEST_EMAIL!;
const password = process.env.E2E_TEST_PASSWORD!;
const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "e2e/.fixture.json"), "utf8")) as { users: { email: string; username: string }[] };
const targetUser = fixture.users.find((user) => user.email === process.env.E2E_TEST_EMAIL_B);

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/community(?:\/)?$/);
}

test.describe("security-critical authenticated journeys", () => {
  test.skip(!email || !password, "E2E test credentials are not configured.");

  test("authenticated user can navigate between core MVP surfaces", async ({ page }) => {
    await signIn(page);
    for (const [path, heading] of [["/community", "Your community"], ["/discover", "Meet someone new."], ["/messages", "Your conversations"], ["/notifications", "Notifications"], ["/profile", "Make your profile yours."]] as const) {
      await page.goto(path);
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    }
  });

  test("profile editor rejects invalid country data before persistence", async ({ page }) => {
    await signIn(page);
    await page.goto("/profile");
    await page.getByRole("textbox", { name: /Country Two-letter ISO/i }).fill("N");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/two-letter ISO country code/i)).toBeVisible();
  });

  test("profile and privacy settings persist through the atomic save flow", async ({ page }) => {
    await signIn(page);
    await page.goto("/profile");
    await page.getByLabel("Display name").fill("E2E Profile Tester");
    await page.getByLabel("Bio").fill("Automated profile persistence test.");
    await page.getByRole("textbox", { name: /Country Two-letter ISO/i }).fill("NG");
    await page.getByLabel("Profile visibility").selectOption("PRIVATE");
    await page.getByLabel("Country visibility").selectOption("PRIVATE");
    await page.getByLabel("Who can message you?").selectOption("NO_ONE");
    const discovery = page.getByRole("checkbox", { name: /Appear in global discovery/i });
    if (await discovery.isChecked()) await discovery.uncheck();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText(/profile has been updated/i);
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue("E2E Profile Tester");
    await expect(page.getByLabel("Bio")).toHaveValue("Automated profile persistence test.");
    await expect(page.getByRole("textbox", { name: /Country Two-letter ISO/i })).toHaveValue("NG");
    await expect(page.getByLabel("Profile visibility")).toHaveValue("PRIVATE");
    await expect(page.getByLabel("Country visibility")).toHaveValue("PRIVATE");
    await expect(page.getByLabel("Who can message you?")).toHaveValue("NO_ONE");
    await expect(discovery).not.toBeChecked();
    await page.getByLabel("Display name").fill("E2E User A Tester");
    await page.getByLabel("Bio").fill("");
    await page.getByLabel("Profile visibility").selectOption("PUBLIC");
    await page.getByLabel("Country visibility").selectOption("PUBLIC");
    await page.getByLabel("Who can message you?").selectOption("FOLLOWERS");
    await discovery.check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText(/profile has been updated/i);
  });

  test("community exposes post creation and safely disables an empty submission", async ({ page }) => {
    await signIn(page);
    await page.goto("/community");
    const composer = page.getByRole("region", { name: "Create a post" });
    await expect(composer).toBeVisible();
    await expect(composer.getByRole("button", { name: "Publish post" })).toBeDisabled();
  });

  test("discovery exposes follow controls and profile safety actions", async ({ page }) => {
    test.skip(!targetUser, "The second E2E fixture user is not available.");
    await signIn(page);
    await page.goto("/discover");
    const targetCard = page.locator("article").filter({ hasText: "E2E User B Tester" }).first();
    if (await targetCard.count()) await expect(targetCard.getByRole("button", { name: "Follow" })).toBeVisible();
    await page.goto(`/u/${targetUser!.username}`);
    await expect(page.getByRole("button", { name: /Block|Unblock/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Report/i })).toBeVisible();
  });

  test("messages surface the block and permission boundary", async ({ page }) => {
    await signIn(page);
    await page.goto("/messages");
    await expect(page.getByText(/Private conversations are protected by account, block, and message-permission rules/i)).toBeVisible();
  });

  test("notifications render the authenticated activity surface", async ({ page }) => {
    await signIn(page);
    await page.goto("/notifications");
    await expect(page.getByText("Notifications", { exact: true }).first()).toBeVisible();
  });
});
