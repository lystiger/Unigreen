import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { BasketProvider } from "@/components/basket/BasketProvider";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ToastProvider } from "@/components/ui/Toast";
import type { PublicProduct } from "@/lib/api/types";
import { getDictionary } from "@/lib/i18n";

const copy = getDictionary("vi").products;
const basketCopy = getDictionary("vi").basket;
const PRODUCTS: PublicProduct[] = [
  {
    sku: "UG-001",
    slug: "bathroom-tissue",
    name: "Giấy vệ sinh",
    summary: "Thông tin sản phẩm đã xác minh.",
    oem_available: true,
    featured: true,
    categories: [],
    primary_media: null,
  },
];

/** Cards carry an add-to-basket control, so the grid needs both providers. */
function renderGrid(ui: ReactElement) {
  return render(
    <ToastProvider>
      <BasketProvider>{ui}</BasketProvider>
    </ToastProvider>,
  );
}

describe("ProductGrid", () => {
  it("renders API products with locale-preserving links", () => {
    renderGrid(
      <ProductGrid
        products={PRODUCTS}
        locale="vi"
        copy={copy}
        basketCopy={basketCopy}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link", { name: PRODUCTS[0]!.name })).toHaveAttribute(
      "href",
      "/vi/san-pham/bathroom-tissue",
    );
  });

  it("shows the empty state instead of a bare grid", () => {
    renderGrid(
      <ProductGrid
        products={[]}
        locale="en"
        copy={getDictionary("en").products}
        basketCopy={getDictionary("en").basket}
      />,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No products listed" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View information" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("falls back to a placeholder while approved pack shots are missing", () => {
    renderGrid(
      <ProductGrid
        products={PRODUCTS}
        locale="vi"
        copy={copy}
        basketCopy={basketCopy}
      />,
    );
    expect(screen.getByText(copy.imagePending)).toBeVisible();
  });

  it("offers an add-to-basket action on every card", () => {
    renderGrid(
      <ProductGrid
        products={PRODUCTS}
        locale="vi"
        copy={copy}
        basketCopy={basketCopy}
      />,
    );
    expect(screen.getByRole("button", { name: basketCopy.add })).toBeVisible();
  });
});
