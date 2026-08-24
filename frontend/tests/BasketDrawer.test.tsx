import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AddToBasketControl } from "@/components/basket/AddToBasketControl";
import { BasketBadge } from "@/components/basket/BasketBadge";
import { BasketDrawer } from "@/components/basket/BasketDrawer";
import { BasketProvider } from "@/components/basket/BasketProvider";
import { ToastProvider } from "@/components/ui/Toast";
import type { PublicProduct } from "@/lib/api/types";
import { BASKET_STORAGE_KEY } from "@/lib/basket/types";
import { getDictionary } from "@/lib/i18n";

const copy = getDictionary("vi").basket;

const product: PublicProduct = {
  sku: "UG-001",
  slug: "giay-ve-sinh",
  name: "Giấy vệ sinh cuộn lớn",
  summary: "Đã xác minh.",
  oem_available: true,
  featured: true,
  categories: [],
  primary_media: null,
};

function Harness() {
  return (
    <ToastProvider>
      <BasketProvider>
        <button type="button">before</button>
        <BasketBadge copy={copy} />
        <AddToBasketControl product={product} copy={copy} compact />
        <BasketDrawer locale="vi" copy={copy} />
      </BasketProvider>
    </ToastProvider>
  );
}

beforeEach(() => window.localStorage.clear());

describe("BasketDrawer", () => {
  it("shows an empty state that explains the basket and links onward", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId("basket-badge"));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: copy.emptyTitle })).toBeVisible();
    expect(screen.getByRole("link", { name: copy.emptyCta })).toHaveAttribute(
      "href",
      "/vi/san-pham",
    );
  });

  it("moves focus to the heading on open", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId("basket-badge"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: copy.title })).toHaveFocus(),
    );
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByTestId("basket-badge");

    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // A drawer that drops focus leaves a keyboard user at the top of the page.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("locks background scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId("basket-badge"));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("lists an added line and its footer actions", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: copy.add }));
    await user.click(screen.getByTestId("basket-badge"));

    expect(screen.getByText(product.name)).toBeVisible();
    expect(screen.getByRole("link", { name: copy.requestQuotation })).toHaveAttribute(
      "href",
      "/vi/inquiry",
    );
    expect(screen.getByRole("link", { name: copy.viewBasket })).toHaveAttribute(
      "href",
      "/vi/gio-hang",
    );
  });
});

describe("BasketBadge", () => {
  it("counts lines and survives a remount from storage", async () => {
    const user = userEvent.setup();
    const first = render(<Harness />);

    await user.click(screen.getByRole("button", { name: copy.add }));
    await waitFor(() =>
      expect(window.localStorage.getItem(BASKET_STORAGE_KEY)).not.toBeNull(),
    );
    first.unmount();

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("basket-badge")).toHaveTextContent("1"),
    );
  });

  it("does not duplicate a line when the same product is added twice", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: copy.add }));
    await user.click(screen.getByRole("button", { name: copy.add }));

    await waitFor(() =>
      expect(screen.getByTestId("basket-badge")).toHaveTextContent("1"),
    );
    // Section 10.1: the toast must say it increased, not that it added.
    expect(screen.getByText(copy.increased)).toBeVisible();
  });
});
