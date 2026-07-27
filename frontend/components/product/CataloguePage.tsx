"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiClientError, apiRequest, queryString } from "@/lib/api/client";
import type { PublicCategory, PublicProductPage } from "@/lib/api/types";
import type { Locale } from "@/lib/types";
import { ApiErrorState, CatalogueSkeleton } from "../ui/AsyncState";
import { ProductGrid } from "./ProductGrid";
import { getDictionary } from "@/lib/i18n";

const COPY = {
  vi: {
    eyebrow: "Danh mục đã xuất bản",
    title: "Sản phẩm",
    search: "Tìm theo tên, mô tả hoặc SKU",
    allCategories: "Tất cả danh mục",
    category: "Danh mục",
    sort: "Sắp xếp",
    featured: "Nổi bật",
    name: "Tên sản phẩm",
    newest: "Mới nhất",
    previous: "Trang trước",
    next: "Trang sau",
    page: "Trang",
    unavailable: "Không thể tải danh mục",
    retry: "Thử lại",
  },
  en: {
    eyebrow: "Published catalogue",
    title: "Products",
    search: "Search by name, summary or SKU",
    allCategories: "All categories",
    category: "Category",
    sort: "Sort",
    featured: "Featured",
    name: "Product name",
    newest: "Newest",
    previous: "Previous",
    next: "Next",
    page: "Page",
    unavailable: "Catalogue unavailable",
    retry: "Retry",
  },
} as const;

export function CataloguePage({ locale }: { readonly locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const parameters = useSearchParams();
  const copy = COPY[locale];
  const [search, setSearch] = useState(parameters.get("q") ?? "");
  const category = parameters.get("category") ?? "";
  const sort = parameters.get("sort") ?? "featured";
  const page = Math.max(1, Number(parameters.get("page") ?? "1") || 1);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(parameters.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const current = parameters.get("q") ?? "";
    if (search === current) return;
    const timer = window.setTimeout(
      () => update({ q: search || null, page: null }),
      350,
    );
    return () => window.clearTimeout(timer);
    // `parameters` is intentionally represented by its current q value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, parameters]);

  const categories = useQuery({
    queryKey: ["public-categories", locale],
    queryFn: () =>
      apiRequest<PublicCategory[]>(`/api/v1/public/categories?locale=${locale}`),
  });
  const products = useQuery({
    queryKey: ["public-products", locale, category, parameters.get("q"), sort, page],
    queryFn: () =>
      apiRequest<PublicProductPage>(
        `/api/v1/public/products?${queryString({
          locale,
          category,
          q: parameters.get("q"),
          sort,
          page,
          page_size: 12,
        })}`,
      ),
  });

  return (
    <section className="shell py-12 lg:py-20">
      <p className="font-mono text-eyebrow uppercase tracking-widest text-brand-green">
        {copy.eyebrow}
      </p>
      <h1 className="mt-3 text-h1 font-semibold text-ink">{copy.title}</h1>

      <div className="mt-8 grid gap-4 rounded-card border border-line bg-paper-raised p-5 md:grid-cols-3">
        <label className="text-data font-medium text-ink">
          {copy.search}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-2 w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-body"
          />
        </label>
        <label className="text-data font-medium text-ink">
          {copy.category}
          <select
            value={category}
            onChange={(event) =>
              update({ category: event.target.value || null, page: null })
            }
            className="mt-2 w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-body"
          >
            <option value="">{copy.allCategories}</option>
            {categories.data?.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-data font-medium text-ink">
          {copy.sort}
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value, page: null })}
            className="mt-2 w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-body"
          >
            <option value="featured">{copy.featured}</option>
            <option value="name">{copy.name}</option>
            <option value="newest">{copy.newest}</option>
          </select>
        </label>
      </div>

      <div className="mt-10">
        {products.isPending ? <CatalogueSkeleton /> : null}
        {products.isError ? (
          <ApiErrorState
            title={copy.unavailable}
            message={
              products.error instanceof ApiClientError
                ? products.error.message
                : copy.unavailable
            }
            requestId={
              products.error instanceof ApiClientError
                ? products.error.detail.request_id
                : undefined
            }
            retryLabel={copy.retry}
            onRetry={() => void products.refetch()}
          />
        ) : null}
        {products.data ? (
          <>
            <ProductGrid
              products={products.data.items}
              locale={locale}
              copy={getDictionary(locale).products}
            />
            <nav
              aria-label={copy.page}
              className="mt-10 flex items-center justify-between border-t border-line pt-6"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
                className="rounded-control border border-line-strong px-4 py-2 disabled:opacity-40"
              >
                {copy.previous}
              </button>
              <span className="font-mono text-data text-ink-muted">
                {copy.page} {page} / {Math.max(1, products.data.pagination.total_pages)}
              </span>
              <button
                type="button"
                disabled={page >= products.data.pagination.total_pages}
                onClick={() => update({ page: String(page + 1) })}
                className="rounded-control border border-line-strong px-4 py-2 disabled:opacity-40"
              >
                {copy.next}
              </button>
            </nav>
          </>
        ) : null}
      </div>
    </section>
  );
}
