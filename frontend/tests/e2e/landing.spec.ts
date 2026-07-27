import { expect, test } from "@playwright/test";

test("the root redirects to the Vietnamese tree", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi-VN");
});

test("the landing page shows the hero, specs and catalogue", async ({ page }) => {
  await page.goto("/vi");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Giấy vệ sinh cuộn lớn",
  );
  await expect(page.getByRole("region", { name: "Thông số sản xuất" })).toBeVisible();
  await expect(page.getByRole("listitem").first()).toBeVisible();
});

test("the language switch keeps the reader on the same route", async ({ page }) => {
  await page.goto("/vi");

  // Below `lg` the switch is inside the collapsed menu, so open it first.
  const menuToggle = page.getByRole("button", { name: "Mở menu" });
  if (await menuToggle.isVisible()) {
    await menuToggle.click();
  }

  await page.getByRole("link", { name: "Chuyển sang tiếng Anh" }).first().click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Coreless bathroom tissue",
  );
});

test("an unknown locale returns 404", async ({ page }) => {
  const response = await page.goto("/fr");
  expect(response?.status()).toBe(404);
});
