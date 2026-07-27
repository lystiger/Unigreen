import type { Metadata } from "next";
import { ProductDetailPage } from "@/components/product/ProductDetailPage";
import { apiRequest } from "@/lib/api/client";
import type { PublicProductDetail } from "@/lib/api/types";
import { isLocale } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  try {
    const product = await apiRequest<PublicProductDetail>(
      `/api/v1/public/products/${encodeURIComponent(slug)}?locale=${locale}`,
    );
    return {
      title: product.meta_title ?? product.name,
      description: product.meta_description ?? product.summary,
    };
  } catch {
    return { title: locale === "vi" ? "Sản phẩm" : "Product" };
  }
}

export default async function VietnameseProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "en") redirect(`/en/products/${slug}`);
  return <ProductDetailPage locale={locale} slug={slug} />;
}
