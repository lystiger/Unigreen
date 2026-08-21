"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiClientError, apiRequest, queryString } from "@/lib/api/client";
import type { PublicProductPage } from "@/lib/api/types";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { ApiErrorState, CatalogueSkeleton } from "../ui/AsyncState";
import { ProductGrid } from "./ProductGrid";

export function ProductPreview({
  locale,
  copy,
}: {
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
}) {
  const query = useQuery({
    queryKey: ["public-products-preview", locale],
    queryFn: () =>
      apiRequest<PublicProductPage>(
        `/api/v1/public/products?${queryString({
          locale,
          featured: true,
          page_size: 3,
        })}`,
      ),
  });

  if (query.isPending) {
    return <CatalogueSkeleton />;
  }
  if (query.isError) {
    const error = query.error instanceof ApiClientError ? query.error : null;
    return (
      <ApiErrorState
        title={locale === "vi" ? "Không thể tải sản phẩm" : "Products unavailable"}
        message={
          error?.message ??
          (locale === "vi"
            ? "Không thể kết nối đến danh mục."
            : "The catalogue service could not be reached.")
        }
        requestId={error?.detail.request_id}
        retryLabel={locale === "vi" ? "Thử lại" : "Retry"}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <ProductGrid
      products={query.data.items}
      locale={locale}
      copy={copy}
      basketCopy={getDictionary(locale).basket}
    />
  );
}
