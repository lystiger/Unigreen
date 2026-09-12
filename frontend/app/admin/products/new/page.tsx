"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { CanonicalProduct, Category, Product, ProductCreate } from "@/lib/api/types";

export default function NewProductPage() {
  const router = useRouter();
  const [canonicalProductId, setCanonicalProductId] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const categories = useQuery({
    queryKey: ["staff-categories"],
    queryFn: () => apiRequest<Category[]>("/api/v1/staff/categories"),
  });
  const canonicalProducts = useQuery({
    queryKey: ["staff-canonical-products"],
    queryFn: () => apiRequest<CanonicalProduct[]>("/api/v1/staff/canonical-products"),
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const create = useMutation({
    mutationFn: (payload: ProductCreate) =>
      apiRequest<Product>("/api/v1/staff/products", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (product) => router.replace(`/admin/products/${product.id}`),
  });

  const onSelectCanonical = (id: string) => {
    setCanonicalProductId(id);
    const cp = canonicalProducts.data?.find((item) => item.id === id);
    if (cp) {
      setSku(cp.sku);
    } else {
      setSku("");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      canonical_product_id: canonicalProductId || null,
      sku: canonicalProductId ? sku : String(data.get("sku") ?? ""),
      slug: String(data.get("slug") ?? ""),
      barcode: String(data.get("barcode") ?? "") || null,
      oem_available: data.get("oem_available") === "on",
      featured: data.get("featured") === "on",
      pack_options: String(data.get("pack_options") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      sort_order: 0,
      category_ids: categoryIds,
      translations: [
        {
          locale: "vi",
          name: String(data.get("name_vi") ?? ""),
          summary: String(data.get("summary_vi") ?? ""),
          description: String(data.get("description_vi") ?? "") || null,
        },
        {
          locale: "en",
          name: String(data.get("name_en") ?? ""),
          summary: String(data.get("summary_en") ?? ""),
          description: String(data.get("description_en") ?? "") || null,
        },
      ],
    });
  };
  const error = create.error instanceof ApiClientError ? create.error : null;
  return (
    <form onSubmit={submit} className="max-w-4xl">
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">
        New draft
      </p>
      <h1 className="mt-2 text-h1 font-semibold">Create product</h1>
      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-control border border-status-rejected/40 p-4"
        >
          <p>{error.message}</p>
          <p className="font-mono text-data">Request ID: {error.detail.request_id}</p>
        </div>
      ) : null}

      <div className="mt-6 rounded-card border border-line bg-paper-raised p-6">
        <h2 className="text-h2 font-semibold">Canonical Product Identity (UniOps)</h2>
        <p className="mt-1 text-data text-ink-muted">
          Connect this presentation catalogue item to an authoritative UniOps product (recommended).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={canonicalProductId}
            onChange={(e) => onSelectCanonical(e.target.value)}
            className="rounded-control border border-line-strong px-3 py-2 text-data"
          >
            <option value="">— Create without mapping (Legacy / Manual SKU) —</option>
            {canonicalProducts.data?.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.sku} - {cp.name} ({cp.unit})
              </option>
            ))}
          </select>
          {canonicalProductId ? (
            <button
              type="button"
              onClick={() => onSelectCanonical("")}
              className="min-h-11 inline-flex items-center rounded-control border border-line px-3 py-2 text-data text-ink-muted hover:bg-paper-sunk"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-5 rounded-card border border-line bg-paper-raised p-6 sm:grid-cols-2">
        <label className="font-medium">
          <div className="flex items-center justify-between">
            <span>SKU</span>
            {canonicalProductId ? (
              <span className="text-xs font-normal text-brand-green">
                Authoritative from UniOps
              </span>
            ) : null}
          </div>
          <input
            required
            name="sku"
            value={canonicalProductId ? sku : undefined}
            defaultValue={!canonicalProductId ? "" : undefined}
            readOnly={Boolean(canonicalProductId)}
            className={`mt-2 w-full rounded-control border border-line-strong px-3 py-2 ${
              canonicalProductId ? "cursor-not-allowed bg-paper-sunk text-ink-muted" : ""
            }`}
          />
        </label>
        <Field label="Slug" name="slug" required />
        <Field label="Barcode (optional)" name="barcode" />
        <label className="font-medium sm:col-span-2">
          Pack options (one per line, first is the default)
          <textarea
            name="pack_options"
            placeholder={"6 rolls\n10 rolls\n12 rolls"}
            className="mt-2 min-h-28 w-full rounded-control border border-line-strong px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-6 pb-2">
          <label>
            <input name="oem_available" type="checkbox" /> OEM available
          </label>
          <label>
            <input name="featured" type="checkbox" /> Featured
          </label>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TranslationFields locale="vi" title="Vietnamese" />
        <TranslationFields locale="en" title="English" />
      </div>
      <fieldset className="mt-6 rounded-card border border-line bg-paper-raised p-6">
        <legend className="px-2 font-medium">Categories</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.data?.map((category) => (
            <label key={category.id}>
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={(event) =>
                  setCategoryIds((current) =>
                    event.target.checked
                      ? [...current, category.id]
                      : current.filter((id) => id !== category.id),
                  )
                }
              />{" "}
              {category.translations.find((item) => item.locale === "en")?.name ??
                category.slug}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={create.isPending}
        className="min-h-11 mt-6 rounded-control bg-brand-green px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {create.isPending ? "Creating…" : "Create draft"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required = false,
}: {
  readonly label: string;
  readonly name: string;
  readonly required?: boolean;
}) {
  return (
    <label className="font-medium">
      {label}
      <input
        required={required}
        name={name}
        className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
      />
    </label>
  );
}

function TranslationFields({
  locale,
  title,
}: {
  readonly locale: "vi" | "en";
  readonly title: string;
}) {
  return (
    <fieldset className="rounded-card border border-line bg-paper-raised p-6">
      <legend className="px-2 font-medium">{title}</legend>
      <Field label="Name" name={`name_${locale}`} required />
      <label className="mt-4 block font-medium">
        Summary
        <textarea
          required
          name={`summary_${locale}`}
          className="mt-2 min-h-24 w-full rounded-control border border-line-strong px-3 py-2"
        />
      </label>
      <label className="mt-4 block font-medium">
        Description
        <textarea
          name={`description_${locale}`}
          className="mt-2 min-h-32 w-full rounded-control border border-line-strong px-3 py-2"
        />
      </label>
    </fieldset>
  );
}
