import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGrid } from "@/components/product/ProductGrid";
import { PRODUCTS } from "@/lib/catalogue";
import { getDictionary } from "@/lib/i18n";

const copy = getDictionary("vi").products;

describe("ProductGrid", () => {
  it("renders a card per product", () => {
    render(<ProductGrid products={PRODUCTS} locale="vi" copy={copy} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(PRODUCTS.length);
    expect(screen.getByRole("link", { name: PRODUCTS[0]!.name.vi })).toHaveAttribute(
      "href",
      `/vi/products/${PRODUCTS[0]!.id}`,
    );
  });

  it("shows the empty state instead of a bare grid", () => {
    render(
      <ProductGrid products={[]} locale="en" copy={getDictionary("en").products} />,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No products listed" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("falls back to a placeholder while pack shots are missing", () => {
    render(<ProductGrid products={PRODUCTS} locale="vi" copy={copy} />);

    expect(screen.getAllByText(copy.imagePending)).toHaveLength(PRODUCTS.length);
  });
});
