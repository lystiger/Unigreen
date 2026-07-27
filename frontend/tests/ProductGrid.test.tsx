import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { PublicProduct } from "@/lib/api/types";
import { getDictionary } from "@/lib/i18n";

const copy = getDictionary("vi").products;
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

describe("ProductGrid", () => {
  it("renders API products with locale-preserving links", () => {
    render(<ProductGrid products={PRODUCTS} locale="vi" copy={copy} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("link", { name: PRODUCTS[0]!.name })).toHaveAttribute(
      "href",
      "/vi/san-pham/bathroom-tissue",
    );
  });

  it("shows the empty state instead of a bare grid", () => {
    render(
      <ProductGrid products={[]} locale="en" copy={getDictionary("en").products} />,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No products listed" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View information" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("falls back to a placeholder while approved pack shots are missing", () => {
    render(<ProductGrid products={PRODUCTS} locale="vi" copy={copy} />);
    expect(screen.getByText(copy.imagePending)).toBeVisible();
  });
});
