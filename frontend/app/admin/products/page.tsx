"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ApiErrorState } from "@/components/ui/AsyncState";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { useCurrentStaff } from "@/lib/auth";

export default function AdminProductsPage() {
  const staff = useCurrentStaff();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const products = useQuery({
    queryKey: ["staff-products"],
    queryFn: () => apiRequest<Product[]>("/api/v1/staff/products"),
  });
  const filtered = useMemo(
    () =>
      (products.data ?? []).filter(
        (product) =>
          (!status || product.status === status) &&
          (!search ||
            `${product.sku} ${product.slug} ${product.translations.map((item) => item.name).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [products.data, search, status],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono text-eyebrow tracking-widest text-brand-green">
            Catalogue
          </p>
          <h1 className="mt-2 text-h1 font-semibold">Products</h1>
        </div>
        {staff.data?.permissions.includes("catalogue:write") ? (
          <Link
            href="/admin/products/new"
            className="inline-flex min-h-11 items-center rounded-control bg-brand-green px-4 py-2 font-medium text-white"
          >
            New product
          </Link>
        ) : null}
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <label>
          <span className="sr-only">Search products</span>
          <input
            type="search"
            placeholder="Search products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-control border border-line-strong px-3 py-2"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-control border border-line-strong px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </label>
      </div>
      {products.isError ? (
        <div className="mt-8">
          <ApiErrorState
            title="Products unavailable"
            message={
              products.error instanceof ApiClientError
                ? products.error.message
                : "Try again."
            }
            requestId={
              products.error instanceof ApiClientError
                ? products.error.detail.request_id
                : undefined
            }
            retryLabel="Retry"
            onRetry={() => void products.refetch()}
          />
        </div>
      ) : null}
      <div className="mt-8 overflow-x-auto rounded-card border border-line bg-paper-raised">
        <table className="w-full text-left">
          <thead className="border-b border-line bg-paper-sunk text-data">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4">Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-line last:border-0">
                <td className="p-4 font-mono text-data">{product.sku}</td>
                <td className="p-4">
                  <Link
                    className="font-medium text-brand-dark underline"
                    href={`/admin/products/${product.id}`}
                  >
                    {product.translations.find((item) => item.locale === "en")?.name ??
                      product.slug}
                  </Link>
                </td>
                <td className="p-4">
                  <StatusBadge status={product.status} />
                </td>
                <td className="p-4 text-data text-ink-muted">v{product.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
