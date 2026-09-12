import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewProductPage from "@/app/admin/products/new/page";
import { ProductEditor } from "@/components/admin/ProductEditor";
import type { CanonicalProduct, Product } from "@/lib/api/types";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

const mockApiRequest = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiRequest: (path: string, init?: RequestInit) => mockApiRequest(path, init),
  ApiClientError: class ApiClientError extends Error {},
  apiBaseUrl: () => "http://localhost:8000",
  cookie: () => "csrf",
}));

const free: CanonicalProduct = {
  id: "0b0c7c1e-0000-4000-8000-000000000002",
  sku: "UG000002",
  name: "Cuộn giấy vệ sinh CN 700gr -2 Lớp",
  unit: "Cuộn",
  category: "general",
  status: "active",
  specifications: {},
  easybooks_code: "TP.GVS700/2",
  easybooks_material_goods_id: "eb-1",
  mapped_catalogue_product_id: null,
};
const taken: CanonicalProduct = {
  ...free,
  id: "0b0c7c1e-0000-4000-8000-000000000001",
  sku: "UG000001",
  name: "Khăn giấy lau tay 175gr",
  easybooks_code: "TP.KT175",
  mapped_catalogue_product_id: "catalogue-other",
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "catalogue-1",
    canonical_product_id: null,
    is_mapped: false,
    sku: "LEGACY-01",
    slug: "legacy",
    barcode: null,
    status: "draft",
    oem_available: false,
    featured: false,
    pack_options: [],
    sort_order: 0,
    version: 1,
    category_ids: [],
    translations: [
      { locale: "vi", name: "Giấy", summary: "Tóm tắt", description: null },
    ],
    specifications: [],
    ...overrides,
  } as Product;
}

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockApiRequest.mockReset();
  replace.mockReset();
  mockApiRequest.mockImplementation(async (path: string) => {
    if (path === "/api/v1/staff/canonical-products") return [taken, free];
    if (path === "/api/v1/staff/categories") return [];
    return product();
  });
});

describe("Create catalogue product", () => {
  it("requires a UniOps product and sends its id, never a SKU", async () => {
    render(wrap(<NewProductPage />));

    const submit = screen.getByRole("button", { name: "Create draft" });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole("textbox", { name: /^sku/i })).not.toBeInTheDocument();

    const select = await screen.findByRole("combobox", { name: "UniOps product" });
    const takenOption = await within(select).findByRole("option", { name: /UG000001/ });
    expect(takenOption).toBeDisabled();
    expect(takenOption).toHaveTextContent("already in catalogue");
    expect(within(select).getByRole("option", { name: /UG000002/ })).toHaveTextContent(
      "EasyBooks TP.GVS700/2",
    );

    fireEvent.change(select, { target: { value: free.id } });
    expect(
      await screen.findByText("TP.GVS700/2", { selector: "dd" }),
    ).toBeInTheDocument();
    for (const [name, value] of [
      ["Slug", "cuon-giay"],
      ["Name", "Cuộn giấy"],
      ["Summary", "Tóm tắt"],
    ] as const) {
      screen.getAllByLabelText(name).forEach((field) => {
        fireEvent.change(field, { target: { value } });
      });
    }
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/v1/staff/products",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const call = mockApiRequest.mock.calls.find(
      ([path]) => path === "/api/v1/staff/products",
    );
    const sent = JSON.parse((call?.[1] as RequestInit).body as string);
    expect(sent.canonical_product_id).toBe(free.id);
    expect(sent).not.toHaveProperty("sku");
  });
});

describe("Catalogue product mapping", () => {
  it("maps an unmapped entry to the chosen UniOps product", async () => {
    render(
      wrap(
        <ProductEditor
          product={product()}
          categories={[]}
          media={[]}
          canWrite
          canPublish={false}
        />,
      ),
    );

    expect(screen.getByText("Unmapped")).toBeInTheDocument();
    const mapButton = screen.getByRole("button", {
      name: "Map to this UniOps product",
    });
    expect(mapButton).toBeDisabled();
    const select = await screen.findByRole("combobox", { name: "UniOps product" });
    await within(select).findByRole("option", { name: /UG000002/ });
    fireEvent.change(select, { target: { value: free.id } });
    await waitFor(() => expect(mapButton).toBeEnabled());
    fireEvent.click(mapButton);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/v1/staff/products/catalogue-1/map",
        {
          method: "POST",
          body: JSON.stringify({ canonical_product_id: free.id }),
        },
      ),
    );
  });

  it("shows a mapped entry's UniOps SKU and EasyBooks code read-only", async () => {
    render(
      wrap(
        <ProductEditor
          product={product({
            canonical_product_id: free.id,
            is_mapped: true,
            sku: "UG000002",
          })}
          categories={[]}
          media={[]}
          canWrite
          canPublish={false}
        />,
      ),
    );

    const section = screen.getByRole("region", { name: "UniOps product" });
    expect(within(section).getByText("Mapped")).toBeInTheDocument();
    expect(within(section).getByText("UG000002")).toBeInTheDocument();
    expect(await within(section).findByText("TP.GVS700/2")).toBeInTheDocument();
    expect(within(section).queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("UG000002")).toHaveAttribute("readonly");
  });
});
