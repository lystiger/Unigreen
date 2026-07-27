"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { ApiErrorState } from "@/components/ui/AsyncState";
import { apiRequest } from "@/lib/api/client";
import type { Category, Media, Product } from "@/lib/api/types";
import { useCurrentStaff } from "@/lib/auth";

export default function AdminProductPage() {
  const { id } = useParams<{ id: string }>();
  const staff = useCurrentStaff();
  const product = useQuery({
    queryKey: ["staff-product", id],
    queryFn: () => apiRequest<Product>(`/api/v1/staff/products/${id}`),
  });
  const categories = useQuery({
    queryKey: ["staff-categories"],
    queryFn: () => apiRequest<Category[]>("/api/v1/staff/categories"),
  });
  const media = useQuery({
    queryKey: ["staff-media", id],
    queryFn: () => apiRequest<Media[]>(`/api/v1/staff/products/${id}/media`),
  });

  if (product.isPending || categories.isPending || media.isPending) {
    return <p aria-busy="true">Loading product…</p>;
  }
  if (product.isError || categories.isError || media.isError) {
    return (
      <ApiErrorState
        title="Product unavailable"
        message="The product workspace could not be loaded."
        retryLabel="Retry"
        onRetry={() => {
          void product.refetch();
          void categories.refetch();
          void media.refetch();
        }}
      />
    );
  }
  return (
    <ProductEditor
      key={`${product.data.id}-${product.data.version}-${media.data.length}`}
      product={product.data}
      categories={categories.data}
      media={media.data}
      canWrite={staff.data?.permissions.includes("catalogue:write") ?? false}
      canPublish={staff.data?.permissions.includes("catalogue:publish") ?? false}
    />
  );
}
