import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type FixtureUser = {
  email: string;
  password: string;
  username: string;
  role?: "MODERATOR";
};

async function fixtureUsers(): Promise<FixtureUser[]> {
  const fixturePath = resolve(process.cwd(), "e2e/.fixture.json");
  const raw = await readFile(fixturePath, "utf8");
  return (JSON.parse(raw) as { users: FixtureUser[] }).users;
}

async function signIn(page: Page, user: FixtureUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.locator('input[autocomplete="current-password"]').fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/community(?:\/)?$/);
}

async function openProfile(page: Page, username: string) {
  await page.goto(`/u/${username}`);
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator("main").getByText(`@${username}`, { exact: true })).toBeVisible();
}

test.describe("moderation role workflow", () => {
  test("report creates a case that a moderator can review, assign, note, resolve, and appeal", async ({ browser }) => {
    test.setTimeout(60_000);

    const users = await fixtureUsers();
    const regularUser = users[0];
    const reporter = users[1];
    const moderator = users.find((user) => user.role === "MODERATOR");

    if (!regularUser || !reporter || !moderator) {
      test.skip(true, "Moderator E2E fixture is unavailable.");
      return;
    }

    const regularContext = await browser.newContext();
    const reporterContext = await browser.newContext();
    const moderatorContext = await browser.newContext();

    try {
      const regularPage = await regularContext.newPage();
      await signIn(regularPage, regularUser);
      await regularPage.goto("/moderation");
      await expect(regularPage.getByText("Moderation access unavailable")).toBeVisible();

      // Use the dedicated moderator fixture as the report target so this workflow
      // remains independent of the cross-user test's intentional blocking state.
      const reporterPage = await reporterContext.newPage();
      await signIn(reporterPage, reporter);
      await openProfile(reporterPage, moderator.username);
      await reporterPage.getByRole("button", { name: "Report", exact: true }).click();
      await expect(reporterPage.getByRole("heading", { name: "Report", exact: true })).toBeVisible();
      await reporterPage.getByLabel("Reason").selectOption("HARASSMENT");
      await reporterPage.getByLabel("Additional details (optional)").fill("E2E moderation workflow report.");
      await reporterPage.getByRole("button", { name: "Submit report" }).click();
      await expect(reporterPage.getByText(/Report submitted/i)).toBeVisible();

      const moderatorPage = await moderatorContext.newPage();
      await signIn(moderatorPage, moderator);
      await moderatorPage.goto("/moderation");
      await expect(moderatorPage.getByRole("heading", { name: "Moderation queue" })).toBeVisible();
      const caseCard = moderatorPage.getByRole("article").filter({ hasText: "USER moderation case" }).first();
      await expect(caseCard).toBeVisible();
      await caseCard.getByRole("button", { name: "Assign to me" }).click();
      await expect(caseCard.getByText("Assigned")).toBeVisible();
      await caseCard.getByRole("link", { name: "Review" }).click();

      await expect(moderatorPage.getByRole("heading", { name: "USER case" })).toBeVisible();
      await moderatorPage.getByPlaceholder("Add an internal moderation note…").fill("Reviewed during E2E moderator workflow.");
      await moderatorPage.getByRole("button", { name: "Add note" }).click();
      await expect(moderatorPage.getByText("Reviewed during E2E moderator workflow.")).toBeVisible();

      await moderatorPage.getByLabel("Action").selectOption({ label: "WARNING" });
      await moderatorPage.getByLabel("Reason").fill("E2E moderation warning after review.");
      await moderatorPage.getByLabel("Severity").selectOption("LOW");
      await moderatorPage.getByRole("button", { name: "Execute moderation action" }).click();

      await expect(moderatorPage.getByText("RESOLVED")).toBeVisible();
      await expect(moderatorPage.getByText("WARNING", { exact: true }).last()).toBeVisible();
      await expect(moderatorPage.getByText("E2E moderation warning after review.")).toBeVisible();

      await moderatorPage.goto("/appeals");
      const appealAction = moderatorPage.getByRole("article").filter({ hasText: "WARNING" }).first();
      await expect(appealAction).toBeVisible();
      await expect(appealAction.getByText(/Severity: LOW/i)).toBeVisible();
      await appealAction.getByLabel(/Appeal this action/i).fill("I am submitting this appeal as part of the E2E moderation workflow.");
      await appealAction.getByRole("button", { name: "Submit appeal" }).click();
      await expect(appealAction.getByText(/Your appeal has been submitted for review/i)).toBeVisible();
      await expect(appealAction.getByRole("button", { name: "Submitted" })).toBeDisabled();
    } finally {
      await Promise.all([regularContext.close(), reporterContext.close(), moderatorContext.close()]);
    }
  });
});
