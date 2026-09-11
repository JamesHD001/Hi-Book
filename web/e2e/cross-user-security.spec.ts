import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const userA = {
  email: process.env.E2E_TEST_EMAIL!,
  password: process.env.E2E_TEST_PASSWORD!,
};
const userB = {
  email: process.env.E2E_TEST_EMAIL_B!,
  password: process.env.E2E_TEST_PASSWORD_B!,
};

type Fixture = { users: { email: string; username: string }[] };
const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "e2e/.fixture.json"), "utf8")) as Fixture;
const fixtureA = fixture.users.find((user) => user.email === userA.email)!;
const fixtureB = fixture.users.find((user) => user.email === userB.email)!;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/community(?:\/)?$/);
}

async function openProfile(page: Page, username: string, displayName: string) {
  await page.goto(`/u/${username}`);
  await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
  await expect(page.getByText(displayName, { exact: true }).first()).toBeVisible();
}

test.describe("two-user authorization and privacy matrix", () => {
  test.skip(
    !userA.email || !userA.password || !userB.email || !userB.password,
    "Two-user E2E credentials are not configured.",
  );

  test("follow, posts, comments, likes, messaging, reporting, privacy, and blocking enforce cross-user boundaries", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const publicPost = `E2E cross-user public post ${Date.now()}`;
    const followerPost = `E2E followers-only post ${Date.now()}`;
    const commentText = `E2E comment ${Date.now()}`;
    const messageText = `E2E message ${Date.now()}`;
    const blockedMessage = `E2E blocked message ${Date.now()}`;

    try {
      await signIn(pageA, userA.email, userA.password);
      await openProfile(pageA, fixtureB.username, "E2E User B Tester");
      await expect(pageA.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageA.getByRole("button", { name: "Follow" }).click();
      await expect(pageA.getByRole("button", { name: "Following" })).toBeVisible();

      await signIn(pageB, userB.email, userB.password);
      await openProfile(pageB, fixtureA.username, "E2E User A Tester");
      await expect(pageB.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageB.getByRole("button", { name: "Follow" }).click();
      await expect(pageB.getByRole("button", { name: "Following" })).toBeVisible();

      await pageA.goto("/community");
      const composerA = pageA.getByRole("region", { name: "Create a post" });
      await composerA.getByPlaceholder("What would you like to share with the community?").fill(publicPost);
      await composerA.getByRole("button", { name: "Publish post" }).click();
      await expect(composerA.getByRole("status")).toHaveText(/post has been published/i);

      await pageB.goto("/community");
      const publicArticle = pageB.locator("article").filter({ hasText: publicPost }).first();
      await expect(publicArticle).toBeVisible();
      await publicArticle.getByRole("button", { name: /Like/ }).click();
      await expect(publicArticle.getByRole("button", { name: /Liked/ })).toBeVisible();
      await publicArticle.getByRole("button", { name: "Comment" }).click();
      await publicArticle.getByPlaceholder("Write a comment…").fill(commentText);
      await publicArticle.getByRole("button", { name: "Comment" }).click();
      await expect(publicArticle.getByText(commentText)).toBeVisible();

      await pageA.goto("/community");
      const followerComposer = pageA.getByRole("region", { name: "Create a post" });
      await followerComposer.getByPlaceholder("What would you like to share with the community?").fill(followerPost);
      await followerComposer.getByLabel("Visibility").selectOption("FOLLOWERS");
      await followerComposer.getByRole("button", { name: "Publish post" }).click();
      await expect(followerComposer.getByRole("status")).toHaveText(/post has been published/i);

      await pageB.goto("/community");
      await expect(pageB.locator("article").filter({ hasText: followerPost }).first()).toBeVisible();

      await openProfile(pageA, fixtureB.username, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Message" }).click();
      await expect(pageA).toHaveURL(/\/messages\/[0-9a-f-]+$/i);
      await pageA.getByPlaceholder("Write a message…").fill(messageText);
      await pageA.getByRole("button", { name: "Send" }).click();
      await expect(pageA.getByText(messageText)).toBeVisible();

      const conversationUrl = pageA.url();
      await pageB.goto(conversationUrl);
      await expect(pageB.getByText(messageText)).toBeVisible();

      await openProfile(pageA, fixtureB.username, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Report" }).click();
      await pageA.getByLabel("Reason").selectOption("OTHER");
      await pageA.getByRole("button", { name: "Submit report" }).click();
      await expect(pageA.getByText(/Report submitted|already submitted/i)).toBeVisible();

      await openProfile(pageB, fixtureA.username, "E2E User A Tester");
      await expect(pageB.getByRole("button", { name: "Following" })).toBeVisible();
      await pageB.getByRole("button", { name: "Following" }).click();
      await expect(pageB.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageB.goto("/community");
      await expect(pageB.locator("article").filter({ hasText: followerPost })).toHaveCount(0);

      await openProfile(pageA, fixtureB.username, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Block" }).click();
      await expect(pageA).toHaveURL(/\/community(?:\/)?$/);

      await pageB.goto("/discover");
      await expect(pageB.locator("article").filter({ hasText: "E2E User A Tester" })).toHaveCount(0);

      await pageB.goto(conversationUrl);
      const messageInput = pageB.getByPlaceholder("Write a message…");
      if (await messageInput.count()) {
        await messageInput.fill(blockedMessage);
        await pageB.getByRole("button", { name: "Send" }).click();
        await expect(pageB.getByText(/blocked|not permitted|permission/i)).toBeVisible();
        await expect(pageB.getByText(blockedMessage)).toHaveCount(0);
      } else {
        await expect(pageB.getByText(/Page not found/i)).toBeVisible();
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
