"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { CanonicalProduct, CanonicalProductDraft } from "@/lib/api/types";

export const canonicalProductsKey = ["staff-canonical-products"] as const;

/**
 * Chooses the UniOps canonical product a catalogue entry presents.
 *
 * UniOps owns product identity, so nothing is matched automatically: staff pick
 * a product by its SKU, name or EasyBooks code. A product already presented by
 * another catalogue entry cannot be picked. When none fits, staff can ask UniOps
 * to create one; UniOps assigns its SKU.
 */
export function CanonicalProductPicker({
  value,
  onChange,
  currentCatalogueProductId,
  disabled = false,
}: {
  readonly value: string;
  readonly onChange: (product: CanonicalProduct | null) => void;
  readonly currentCatalogueProductId?: string;
  readonly disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const products = useQuery({
    queryKey: canonicalProductsKey,
    queryFn: () => apiRequest<CanonicalProduct[]>("/api/v1/staff/canonical-products"),
  });
  const create = useMutation({
    mutationFn: (draft: CanonicalProductDraft) =>
      apiRequest<CanonicalProduct>("/api/v1/staff/canonical-products", {
        method: "POST",
        body: JSON.stringify(draft),
      }),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: canonicalProductsKey });
      setCreating(false);
      onChange(product);
    },
  });

  const selected = products.data?.find((item) => item.id === value) ?? null;
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (item) =>
        item.id === value ||
        !needle ||
        `${item.sku} ${item.name} ${item.easybooks_code ?? ""}`
          .toLowerCase()
          .includes(needle),
    );
  }, [products.data, search, value]);

  const loadError = products.error instanceof ApiClientError ? products.error : null;

  return (
    <div>
      {loadError ? (
        <p role="alert" className="text-data text-status-rejected">
          UniOps products could not be loaded: {loadError.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label>
          <span className="sr-only">Search UniOps products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search SKU, name or EasyBooks code"
            disabled={disabled}
            className="rounded-control border border-line-strong px-3 py-2 text-data"
          />
        </label>
        <label>
          <span className="sr-only">UniOps product</span>
          <select
            value={value}
            disabled={disabled || products.isLoading}
            onChange={(event) =>
              onChange(
                products.data?.find((item) => item.id === event.target.value) ?? null,
              )
            }
            className="max-w-full rounded-control border border-line-strong px-3 py-2 text-data"
          >
            <option value="">
              {products.isLoading
                ? "Loading UniOps products…"
                : "Select a UniOps product"}
            </option>
            {visible.map((item) => {
              const taken =
                item.mapped_catalogue_product_id != null &&
                item.mapped_catalogue_product_id !== currentCatalogueProductId;
              return (
                <option key={item.id} value={item.id} disabled={taken}>
                  {item.sku} · {item.name} · {item.unit}
                  {item.easybooks_code ? ` · EasyBooks ${item.easybooks_code}` : ""}
                  {item.status === "discontinued" ? " · discontinued" : ""}
                  {taken ? " · already in catalogue" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCreating((open) => !open)}
          className="min-h-11 rounded-control border border-line px-3 py-2 text-data"
        >
          No match? Create in UniOps
        </button>
      </div>

      {selected ? (
        <dl className="mt-4 grid gap-3 text-data sm:grid-cols-3">
          <div>
            <dt className="text-caption text-ink-muted">UniOps SKU</dt>
            <dd className="font-mono font-semibold">{selected.sku}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">Official name</dt>
            <dd>{selected.name}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">EasyBooks code</dt>
            <dd className="font-mono">{selected.easybooks_code ?? "—"}</dd>
          </div>
        </dl>
      ) : null}

      {creating ? (
        <CreateCanonicalProduct
          pending={create.isPending}
          error={create.error instanceof ApiClientError ? create.error : null}
          onSubmit={(draft) => create.mutate(draft)}
        />
      ) : null}
    </div>
  );
}

function CreateCanonicalProduct({
  pending,
  error,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly error: ApiClientError | null;
  readonly onSubmit: (draft: CanonicalProductDraft) => void;
}) {
  // A nested <form> is invalid inside the product form, so this is a group of
  // fields with its own button rather than a form.
  const [draft, setDraft] = useState({
    name: "",
    unit: "",
    category: "general",
    code: "",
  });
  const ready = draft.name.trim() && draft.unit.trim();
  return (
    <fieldset className="mt-4 rounded-control border border-line p-4">
      <legend className="px-2 font-medium">New UniOps product</legend>
      <p className="text-data text-ink-muted">
        UniOps assigns the SKU. A product that differs in ply, size, weight or pack is a
        separate product.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-data text-status-rejected">
          {error.message}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["name", "Official name"],
            ["unit", "Unit"],
            ["category", "Category"],
            ["code", "EasyBooks code (optional)"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="font-medium">
            {label}
            <input
              value={draft[field]}
              onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
              className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!ready || pending}
        onClick={() =>
          onSubmit({
            name: draft.name.trim(),
            unit: draft.unit.trim(),
            category: draft.category.trim() || "general",
            code: draft.code.trim() || null,
            specifications: {},
          })
        }
        className="min-h-11 mt-4 rounded-control bg-brand-green px-4 py-2 text-data font-medium text-white disabled:opacity-50"
      >
        {pending ? "Creating in UniOps…" : "Create in UniOps"}
      </button>
    </fieldset>
  );
}
