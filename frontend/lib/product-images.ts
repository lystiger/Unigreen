import type { PublicProduct, PublicProductDetail } from "@/lib/api/types";

export function getProductFallbackImage(
  product: Pick<PublicProduct | PublicProductDetail, "slug" | "categories"> & {
    name?: string;
  },
): { url: string; alt: string } {
  const combinedText = [
    product.slug,
    product.name ?? "",
    ...(product.categories?.map((c) => `${c.slug} ${c.name}`) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    combinedText.includes("toilet") ||
    combinedText.includes("ve-sinh") ||
    combinedText.includes("bath") ||
    combinedText.includes("ve sinh")
  ) {
    return {
      url: "/products/IMG_1541_nobg.webp",
      alt: "Uni-Green Bathroom Tissue",
    };
  }

  if (
    combinedText.includes("towel") ||
    combinedText.includes("lau") ||
    combinedText.includes("kitchen") ||
    combinedText.includes("bep")
  ) {
    return {
      url: "/products/IMG_1544_nobg.webp",
      alt: "Uni-Green Paper Towels",
    };
  }

  if (
    combinedText.includes("facial") ||
    combinedText.includes("tissue") ||
    combinedText.includes("lua") ||
    combinedText.includes("hop") ||
    combinedText.includes("rut")
  ) {
    return {
      url: "/products/IMG_1535_nobg.webp",
      alt: "Uni-Green Facial Tissue",
    };
  }

  if (
    combinedText.includes("napkin") ||
    combinedText.includes("an") ||
    combinedText.includes("table") ||
    combinedText.includes("khan an")
  ) {
    return {
      url: "/products/IMG_1537_nobg.webp",
      alt: "Uni-Green Table Napkins",
    };
  }

  if (
    combinedText.includes("jumbo") ||
    combinedText.includes("jrt") ||
    combinedText.includes("cuon lon")
  ) {
    return {
      url: "/products/IMG_1553_nobg.webp",
      alt: "Uni-Green Jumbo Roll Tissue",
    };
  }

  return {
    url: "/products/IMG_1541_nobg.webp",
    alt: "Uni-Green Products",
  };
}
