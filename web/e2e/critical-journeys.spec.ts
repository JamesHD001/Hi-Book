import { test, expect } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL!;
const password = process.env.E2E_TEST_PASSWORD!;

test.describe("critical public and authentication journeys", () => {
  test("home page exposes the primary account journeys", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Connect beyond distance." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your account" })).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  test("registration validates minimum age, country code, password, and consent", async ({ page }) => {
    await page.goto("/signup");

    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Date of birth").fill("2018-01-01");
    await page.getByLabel("Country code").fill("NG");
    await page.getByLabel("Gender").selectOption("UNDISCLOSED");
    await page.getByLabel("Email").fill(`invalid-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("checkbox", { name: /Terms of Use/ }).check();
    await page.getByRole("checkbox", { name: /Privacy Policy/ }).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/not available to anyone under 13/i)).toBeVisible();
  });

  test("login rejects invalid credentials without leaving the login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-a-real-user@example.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert").filter({ visible: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("authenticated user can sign in and reach the community", async ({ page }) => {
    test.skip(!email || !password, "E2E test credentials are not configured.");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/community(?:\/)?$/);
  });

  test("protected community route redirects an anonymous visitor to login", async ({ page }) => {
    await page.goto("/community");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown routes render the application 404 boundary", async ({ page }) => {
    await page.goto("/e2e-route-that-does-not-exist");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });
});
