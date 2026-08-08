import { test, expect } from "@playwright/test";

test.describe("Settings Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ridhoauliama97@gmail.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
  });

  test("users page loads with table", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await page.waitForURL("/settings/users");
    await expect(page.locator("h1")).toContainText("Users");
    await expect(page.getByText("ridhoauliama97@gmail.com")).toBeVisible();
    await expect(page.getByText("Super Admin")).toBeVisible();
  });

  test("roles page loads", async ({ page }) => {
    await page.goto("/settings/roles");
    await expect(page.locator("h1")).toContainText("Roles");
    await expect(page.getByText("Super Admin")).toBeVisible();
  });

  test("permissions page loads with matrix", async ({ page }) => {
    await page.goto("/settings/permissions");
    await expect(page.locator("h1")).toContainText("Permissions");
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Analitik")).toBeVisible();
  });

  test("periods page loads", async ({ page }) => {
    await page.goto("/settings/periods");
    await expect(page.locator("h1")).toContainText("Periode");
    await expect(page.getByRole("button", { name: "Tambah Periode" })).toBeVisible();
  });

  test("approvals page loads", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page.locator("h1")).toContainText("Approval");
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: "Transactions" }).click();
    await expect(page).toHaveURL("/transactions");

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL("/settings/users");
  });
});
