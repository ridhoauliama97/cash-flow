import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2, h3")).toContainText("Cash Flow Dashboard");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ridhoauliama97@gmail.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await expect(page.locator("h1")).toContainText("Overview");
    await expect(page.getByText("ridhoauliama97@gmail.com")).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@email.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
  });

  test("logout redirects to login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ridhoauliama97@gmail.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await page.getByLabel("Keluar").click();
    await page.waitForURL("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
