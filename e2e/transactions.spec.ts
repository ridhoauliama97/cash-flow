import { test, expect } from "@playwright/test";

test.describe("Transactions CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ridhoauliama97@gmail.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
  });

  test("transaction page loads with table", async ({ page }) => {
    await page.getByRole("link", { name: "Transactions" }).click();
    await page.waitForURL("/transactions");
    await expect(page.locator("h1")).toContainText("Transaksi");
    await expect(page.getByRole("button", { name: "Tambah Transaksi" })).toBeVisible();
  });

  test("create and delete a transaction", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Tambah Transaksi" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("Tipe").click();
    await page.getByRole("option", { name: "Pemasukan" }).click();
    await page.getByLabel("Deskripsi").fill("E2E Test Transaction");
    await page.getByLabel("Jumlah").fill("50000");
    await page.getByRole("button", { name: "Buat" }).click();

    await expect(page.getByText("E2E Test Transaction")).toBeVisible({ timeout: 5000 });

    await page.getByText("E2E Test Transaction").locator("..").getByRole("button", { name: "Hapus" }).click();
    page.on("dialog", (dialog) => dialog.accept());
    await expect(page.getByText("E2E Test Transaction")).not.toBeVisible({ timeout: 5000 });
  });

  test("submit transaction for approval", async ({ page }) => {
    await page.goto("/transactions");
    await page.getByRole("button", { name: "Tambah Transaksi" }).click();

    await page.getByLabel("Tipe").click();
    await page.getByRole("option", { name: "Pemasukan" }).click();
    await page.getByLabel("Deskripsi").fill("Submit Test");
    await page.getByLabel("Jumlah").fill("25000");
    await page.getByRole("button", { name: "Buat" }).click();

    await expect(page.getByText("Submit Test")).toBeVisible({ timeout: 5000 });

    await page.getByText("Submit Test").locator("..").getByRole("button", { name: "Ajukan" }).click();
    page.on("dialog", (dialog) => dialog.accept());
    await expect(page.getByText("Menunggu")).toBeVisible({ timeout: 5000 });
  });
});
