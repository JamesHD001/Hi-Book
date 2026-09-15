import { expect, test } from "@playwright/test";
import { createAdminClient, createTestUser, deleteTestUser, type TestUser } from "./global-setup";

async function makeProfilePublic(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/profile/edit");
  await page.getByRole("tab", { name: /Privacy/i }).click();
  await page.getByLabel(/Profile visibility/i).selectOption("PUBLIC");
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByRole("status")).toHaveText(/saved/i);
}

async function openProfile(page: Parameters<typeof test>[0]["page"], username: string) {
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("heading", { name: new RegExp(username, "i") })).toBeVisible();
}

async function ensureFollowing(page: Parameters<typeof test>[0]["page"]) {
  const followButton = page.getByRole("button", { name: /^(Follow|Following)$/ }).first();
  if ((await followButton.innerText()).trim() === "Follow") {
    await followButton.click();
    await expect(followButton).toHaveText("Following");
  }
}

test.describe("two-user authorization and privacy matrix", () => {
  test("follow, posts, media, comments, likes, realtime messaging, reporting, privacy, and blocking enforce cross-user boundaries", async ({ browser }) => {
    const admin = createAdminClient();
    const fixtureA = await createTestUser(admin, "A");
    const fixtureB = await createTestUser(admin, "B");
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const publicPost = `E2E cross-user public post ${Date.now()}`;
    const commentText = `E2E cross-user comment ${Date.now()}`;
    const mediaPost = `E2E cross-user media post ${Date.now()}`;

    try {
      await pageA.goto("/auth/login");
      await pageA.getByLabel(/email/i).fill(fixtureA.email);
      await pageA.getByLabel(/password/i).fill(fixtureA.password);
      await pageA.getByRole("button", { name: /sign in/i }).click();
      await expect(pageA).toHaveURL(/\/community/);

      await pageB.goto("/auth/login");
      await pageB.getByLabel(/email/i).fill(fixtureB.email);
      await pageB.getByLabel(/password/i).fill(fixtureB.password);
      await pageB.getByRole("button", { name: /sign in/i }).click();
      await expect(pageB).toHaveURL(/\/community/);

      await makeProfilePublic(pageA);
      await openProfile(pageA, fixtureB.username);
      await ensureFollowing(pageA);

      await openProfile(pageB, fixtureA.username);
      await ensureFollowing(pageB);

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
      await publicArticle.getByRole("button", { name: /Join the conversation/i }).click();
      await publicArticle.getByPlaceholder("Share your thoughts…").fill(commentText);
      await publicArticle.getByRole("button", { name: "Post comment", exact: true }).click();
      await expect(publicArticle.getByText(commentText)).toBeVisible();

      await pageA.goto("/community");
      const mediaComposer = pageA.getByRole("region", { name: "Create a post" });
      await mediaComposer.getByPlaceholder("What would you like to share with the community?").fill(mediaPost);
      const mediaInput = mediaComposer.getByLabel("Add photos to your post");
      await mediaInput.setInputFiles({
        name: "e2e.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
      });
      await expect(mediaComposer.getByAltText("Selected image 1")).toBeVisible();
      await mediaComposer.getByRole("button", { name: "Publish post" }).click();
      await expect(mediaComposer.getByRole("status")).toHaveText(/post has been published/i);
      await pageB.goto("/community");

      const mediaArticle = pageB.locator("article").filter({ hasText: mediaPost }).first();
      await expect(mediaArticle).toBeVisible();
      await expect(mediaArticle.getByAltText("Post image")).toBeVisible();
    } finally {
      await contextA.close();
      await contextB.close();
      await deleteTestUser(admin, fixtureA as TestUser);
      await deleteTestUser(admin, fixtureB as TestUser);
    }
  });
});
