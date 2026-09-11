import { test, expect, type Page } from "@playwright/test";

const userA = {
  email: process.env.E2E_TEST_EMAIL!,
  password: process.env.E2E_TEST_PASSWORD!,
};
const userB = {
  email: process.env.E2E_TEST_EMAIL_B!,
  password: process.env.E2E_TEST_PASSWORD_B!,
};

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/community(?:\/)?$/);
}

async function openDiscoveredProfile(page: Page, displayName: string) {
  await page.goto("/discover");
  const card = page.locator("article").filter({ hasText: displayName }).first();
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "View profile" }).click();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
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

    try {
      // A -> B follow and B -> A follow establish the real social graph.
      await signIn(pageA, userA.email, userA.password);
      await openDiscoveredProfile(pageA, "E2E User B Tester");
      await expect(pageA.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageA.getByRole("button", { name: "Follow" }).click();
      await expect(pageA.getByRole("button", { name: "Following" })).toBeVisible();

      await signIn(pageB, userB.email, userB.password);
      await openDiscoveredProfile(pageB, "E2E Profile Tester");
      await expect(pageB.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageB.getByRole("button", { name: "Follow" }).click();
      await expect(pageB.getByRole("button", { name: "Following" })).toBeVisible();

      // A publishes a public post; B must be able to read, like, and comment on it.
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

      // Followers-only content is visible while B follows A.
      await pageA.goto("/community");
      const followerComposer = pageA.getByRole("region", { name: "Create a post" });
      await followerComposer.getByPlaceholder("What would you like to share with the community?").fill(followerPost);
      await followerComposer.getByLabel("Visibility").selectOption("FOLLOWERS");
      await followerComposer.getByRole("button", { name: "Publish post" }).click();
      await expect(followerComposer.getByRole("status")).toHaveText(/post has been published/i);

      await pageB.goto("/community");
      await expect(pageB.locator("article").filter({ hasText: followerPost }).first()).toBeVisible();

      // A can message B because B follows A and B's message permission defaults to FOLLOWERS.
      await openDiscoveredProfile(pageA, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Message" }).click();
      await expect(pageA).toHaveURL(/\/messages\/[0-9a-f-]+$/i);
      await pageA.getByPlaceholder("Write a message…").fill(messageText);
      await pageA.getByRole("button", { name: "Send" }).click();
      await expect(pageA.getByText(messageText)).toBeVisible();

      // B sees the same conversation through the independent session.
      const conversationUrl = pageA.url();
      await pageB.goto(conversationUrl);
      await expect(pageB.getByText(messageText)).toBeVisible();

      // Reporting is independent from blocking and creates a safety signal.
      await openDiscoveredProfile(pageA, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Report" }).click();
      await pageA.getByLabel("Reason").selectOption("OTHER");
      await pageA.getByRole("button", { name: "Submit report" }).click();
      await expect(pageA.getByText(/Report submitted/i)).toBeVisible();

      // B unfollows A. The followers-only post must then disappear from B's feed.
      await openDiscoveredProfile(pageB, "E2E Profile Tester");
      await expect(pageB.getByRole("button", { name: "Following" })).toBeVisible();
      await pageB.getByRole("button", { name: "Following" }).click();
      await expect(pageB.getByRole("button", { name: "Follow" })).toBeVisible();
      await pageB.goto("/community");
      await expect(pageB.locator("article").filter({ hasText: followerPost })).toHaveCount(0);

      // A blocks B. The block removes the social edge and B can no longer discover A.
      await openDiscoveredProfile(pageA, "E2E User B Tester");
      await pageA.getByRole("button", { name: "Block" }).click();
      await expect(pageA).toHaveURL(/\/community(?:\/)?$/);

      await pageB.goto("/discover");
      await expect(pageB.locator("article").filter({ hasText: "E2E Profile Tester" })).toHaveCount(0);

      // The blocked user cannot continue using the existing direct conversation.
      await pageB.goto(conversationUrl);
      await expect(pageB.getByRole("heading", { name: "Page not found" })).toBeVisible();
      await expect(pageB.getByPlaceholder("Write a message…")).toHaveCount(0);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
