import { expect, test, type Page } from "@playwright/test";

/**
 * PR 3 scope only: collecting products and surviving a reload. The submission
 * path is PR 5 and is blocked on the inquiry contract.
 */

function summary(slug: string, name: string) {
  return {
    sku: slug.toUpperCase(),
    slug,
    name,
    summary: "Reviewed public product information.",
    oem_available: true,
    featured: true,
    categories: [],
    primary_media: null,
  };
}

const CATALOGUE = [
  summary("verified-tissue", "Verified tissue"),
  summary("mega-roll", "Mega roll"),
];

async function mockPublicApi(page: Page) {
  await page.route("http://localhost:8000/api/v1/public/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/v1/public/categories") {
      await route.fulfill({ json: [] });
      return;
    }

    const detail = CATALOGUE.find((p) => url.pathname.endsWith(`/${p.slug}`));
    if (detail !== undefined) {
      await route.fulfill({
        json: {
          ...detail,
          description: null,
          meta_title: null,
          meta_description: null,
          specifications: [],
          media: [],
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        items: CATALOGUE,
        pagination: { page: 1, page_size: 12, total: CATALOGUE.length, total_pages: 1 },
      },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPublicApi(page);
});

/**
 * Section 10.1: adding on a narrow viewport opens the drawer, because the
 * header badge is easy to miss there. Tests that go on to use the header must
 * dismiss it first; the behaviour itself is asserted separately below.
 */
async function dismissDrawerIfOpen(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
}

test("products collected from the catalogue survive a reload", async ({ page }) => {
  await page.goto("/en/products");

  const addButtons = page.getByRole("button", { name: "Add to basket" });
  await addButtons.first().click();
  await dismissDrawerIfOpen(page);
  await addButtons.nth(1).click();
  await dismissDrawerIfOpen(page);

  const badge = page.getByTestId("basket-badge");
  await expect(badge).toContainText("2");

  await page.reload();
  // The basket is the buyer's assembled requirement; losing it on reload is
  // the failure this whole persistence layer exists to prevent (S2-02).
  await expect(page.getByTestId("basket-badge")).toContainText("2");
});

test("adding the same product twice increments instead of duplicating", async ({
  page,
}) => {
  await page.goto("/en/products");

  const first = page.getByRole("button", { name: "Add to basket" }).first();
  await first.click();
  await dismissDrawerIfOpen(page);
  await first.click();
  await dismissDrawerIfOpen(page);

  await expect(page.getByTestId("basket-badge")).toContainText("1");
});

test("the drawer opens, traps Escape and closes", async ({ page }) => {
  await page.goto("/en/products");
  await page.getByRole("button", { name: "Add to basket" }).first().click();
  await dismissDrawerIfOpen(page);

  await page.getByTestId("basket-badge").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Inquiry basket" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the basket page lists lines and is reachable in both locales", async ({
  page,
}) => {
  await page.goto("/en/products");
  await page.getByRole("button", { name: "Add to basket" }).first().click();
  await dismissDrawerIfOpen(page);

  await page.goto("/en/basket");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inquiry basket");
  await expect(page.getByTestId("basket-lines").getByRole("listitem")).toHaveCount(1);

  await page.goto("/vi/gio-hang");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Giỏ yêu cầu");
});

test("the basket page redirects a mismatched locale slug", async ({ page }) => {
  await page.goto("/vi/basket");
  await expect(page).toHaveURL(/\/vi\/gio-hang$/);

  await page.goto("/en/gio-hang");
  await expect(page).toHaveURL(/\/en\/basket$/);
});

test("an empty basket explains itself and links to the catalogue", async ({ page }) => {
  await page.goto("/en/basket");

  await expect(
    page.getByRole("heading", { name: "Your inquiry basket is empty" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse the catalogue" }),
  ).toHaveAttribute("href", "/en/products");
});

test("a line whose product is unpublished is flagged, not silently dropped", async ({
  page,
}) => {
  await page.goto("/en/products");
  await page.getByRole("button", { name: "Add to basket" }).first().click();

  // The catalogue now returns only the second product.
  await page.route("http://localhost:8000/api/v1/public/products?*", async (route) => {
    await route.fulfill({
      json: {
        items: [CATALOGUE[1]],
        pagination: { page: 1, page_size: 100, total: 1, total_pages: 1 },
      },
    });
  });

  await page.goto("/en/basket");
  await expect(page.getByText("No longer available")).toBeVisible();
  // Still visible so the buyer can see what changed (section 4.2).
  await expect(page.getByTestId("basket-lines").getByRole("listitem")).toHaveCount(1);
});

test("adding on a narrow viewport opens the drawer as confirmation", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "desktop deliberately does not interrupt with the drawer");

  await page.goto("/en/products");
  await page.getByRole("button", { name: "Add to basket" }).first().click();

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("adding on a wide viewport leaves the drawer closed", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile === true, "mobile opens the drawer by design");

  await page.goto("/en/products");
  await page.getByRole("button", { name: "Add to basket" }).first().click();

  await expect(page.getByTestId("basket-badge")).toContainText("1");
  await expect(page.getByRole("dialog")).toBeHidden();
});
