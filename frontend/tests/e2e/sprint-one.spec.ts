import { expect, test, type Page } from "@playwright/test";

const publicProduct = {
  sku: "UG-001",
  slug: "verified-tissue",
  name: "Verified tissue",
  summary: "Reviewed public product information.",
  oem_available: true,
  featured: true,
  categories: [
    {
      slug: "tissue",
      name: "Tissue",
      description: null,
      meta_title: null,
      meta_description: null,
    },
  ],
  primary_media: null,
};

async function mockPublicApi(page: Page) {
  await page.route("http://localhost:8000/api/v1/public/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/public/categories") {
      await route.fulfill({
        json: [
          {
            slug: "tissue",
            name: url.searchParams.get("locale") === "vi" ? "Khăn giấy" : "Tissue",
            description: null,
            meta_title: null,
            meta_description: null,
          },
        ],
      });
      return;
    }
    if (url.pathname.endsWith("/verified-tissue")) {
      await route.fulfill({
        json: {
          ...publicProduct,
          name:
            url.searchParams.get("locale") === "vi"
              ? "Sản phẩm đã xác minh"
              : publicProduct.name,
          description: "Only reviewed content is public.",
          meta_title: null,
          meta_description: null,
          specifications: [
            {
              key: "basis_weight",
              label: "Basis weight",
              value: "15",
              unit: "g/m²",
              is_highlighted: true,
            },
          ],
          media: [],
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        items: [
          {
            ...publicProduct,
            name:
              url.searchParams.get("locale") === "vi"
                ? "Sản phẩm đã xác minh"
                : publicProduct.name,
          },
        ],
        pagination: { page: 1, page_size: 12, total: 1, total_pages: 1 },
      },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockPublicApi(page);
});

test("the root redirects to the Vietnamese landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi-VN");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Made to specification",
  );
  await expect(
    page.getByRole("heading", { name: "What we produce" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jumbo rolls" }),
  ).toBeVisible();
});

test("catalogue search, category, sorting and localized detail work", async ({
  page,
}) => {
  let searched = false;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === "/api/v1/public/products" &&
      url.searchParams.get("q") === "UG"
    ) {
      searched = true;
    }
  });
  await page.goto("/en/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByLabel("Search by name, summary or SKU").fill("UG");
  await expect.poll(() => searched).toBe(true);
  await page.getByLabel("Category").selectOption("tissue");
  await page.getByLabel("Sort").selectOption("name");
  await page.getByRole("link", { name: "Verified tissue" }).click();
  await expect(page).toHaveURL(/\/en\/products\/verified-tissue$/);
  await expect(page.getByRole("heading", { name: "Verified tissue" })).toBeVisible();
  await expect(page.getByText("Basis weight")).toBeVisible();
});

test("the mobile language switch preserves the route family", async ({ page }) => {
  await page.goto("/vi/san-pham");
  const menuToggle = page.getByRole("button", { name: "Mở menu" });
  if (await menuToggle.isVisible()) await menuToggle.click();
  await page.getByRole("link", { name: "Chuyển sang tiếng Anh" }).first().click();
  await expect(page).toHaveURL(/\/en\/products$/);
});

test("staff login uses cookie auth and opens permission-aware products", async ({
  page,
}) => {
  await page.route("http://localhost:8000/api/v1/auth/login", async (route) => {
    await route.fulfill({
      headers: {
        "access-control-allow-origin": "http://localhost:3000",
        "access-control-allow-credentials": "true",
        "set-cookie": "ug_csrf=test-token; Path=/; SameSite=Lax",
      },
      json: {
        id: "10000000-0000-0000-0000-000000000001",
        email: "editor@example.com",
        role: "content_editor",
        permissions: ["catalogue:read", "catalogue:write", "catalogue:publish"],
      },
    });
  });
  await page.route("http://localhost:8000/api/v1/staff/products", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("editor@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New product" })).toBeVisible();
});

test("an unknown locale returns 404", async ({ page }) => {
  const response = await page.goto("/fr");
  expect(response?.status()).toBe(404);
});
