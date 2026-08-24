"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import type { PublicProductDetail } from "@/lib/api/types";
import { AddToBasketControl } from "@/components/basket/AddToBasketControl";
import { getDictionary } from "@/lib/i18n";
import { cataloguePath, productPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { CatalogueSkeleton } from "../ui/AsyncState";

interface StaticProduct {
  slug: string;
  sku: string;
  name: { vi: string; en: string };
  summary: { vi: string; en: string };
  description: { vi: string; en: string };
  categories: { slug: string; name: { vi: string; en: string } }[];
  images: { src: string; alt: { vi: string; en: string } }[];
  oem_available: boolean;
  specifications: { key: string; label: { vi: string; en: string }; value: { vi: string; en: string }; unit?: string }[];
}

const STATIC_PRODUCTS: Record<string, StaticProduct> = {
  "jumbo-rolls": {
    slug: "jumbo-rolls",
    sku: "UG-JRT-01",
    name: {
      en: "Jumbo Rolls",
      vi: "Cuộn giấy Jumbo",
    },
    summary: {
      en: "Parent jumbo rolls converted to custom width, basis weight (GSM), diameter and core diameter for industrial converting.",
      vi: "Cuộn giấy jumbo nguyên liệu được chia khổ, cuộn lại theo đúng định lượng (GSM), đường kính và lõi yêu cầu.",
    },
    description: {
      en: "Uni-Green produces and converts jumbo parent rolls on our automated production lines in Hưng Yên. Tailored for tissue converters, packaging facilities, and industrial buyers requiring consistent tensile strength, brightness, and controlled moisture levels across every production batch.",
      vi: "Uni-Green sản xuất và chuyển đổi cuộn giấy jumbo trên dây chuyền tự động tại Hưng Yên. Phù hợp cho các xưởng gia công giấy, nhà máy bao bì và đối tác công nghiệp cần độ dai, độ trắng và độ ẩm ổn định trên từng lô hàng.",
    },
    categories: [
      { slug: "jumbo", name: { en: "Jumbo Rolls", vi: "Giấy cuộn lớn" } },
      { slug: "raw-material", name: { en: "Raw Material", vi: "Nguyên liệu" } },
    ],
    images: [
      { src: "/images/products/jumbo-roll.webp", alt: { en: "Uni-Green Jumbo Roll Pack", vi: "Cuộn giấy Jumbo Uni-Green" } },
      { src: "/images/factory/jumbo-storage.webp", alt: { en: "Jumbo roll storage", vi: "Kho lưu trữ cuộn Jumbo" } },
      { src: "/images/factory/rewinder-detail.webp", alt: { en: "Rewinder line detail", vi: "Dây chuyền cuộn xả" } },
    ],
    oem_available: true,
    specifications: [
      { key: "gsm", label: { en: "Basis Weight (GSM)", vi: "Định lượng (GSM)" }, value: { en: "13 – 18", vi: "13 – 18" }, unit: "g/m²" },
      { key: "ply", label: { en: "Ply Count", vi: "Số lớp" }, value: { en: "1 – 3 ply", vi: "1 – 3 lớp" } },
      { key: "diameter", label: { en: "Roll Diameter", vi: "Đường kính cuộn" }, value: { en: "1,000 – 1,200", vi: "1.000 – 1.200" }, unit: "mm" },
      { key: "width", label: { en: "Roll Width", vi: "Khổ rộng cuộn" }, value: { en: "1,200 – 2,800", vi: "1.200 – 2.800" }, unit: "mm" },
      { key: "core", label: { en: "Core Inner Diameter", vi: "Đường kính lõi trong" }, value: { en: "76 (3 inch)", vi: "76 (3 inch)" }, unit: "mm" },
      { key: "material", label: { en: "Material Origin", vi: "Nguồn gốc nguyên liệu" }, value: { en: "100% Virgin wood pulp / Mix pulp", vi: "100% Bột gỗ nguyên sinh / Bột hỗn hợp" } },
      { key: "brightness", label: { en: "Brightness", vi: "Độ trắng" }, value: { en: "82% – 88% ISO", vi: "82% – 88% ISO" } },
      { key: "standards", label: { en: "Quality Standard", vi: "Tiêu chuẩn chất lượng" }, value: { en: "Japanese Standard / ISO 9001:2015", vi: "Tiêu chuẩn Nhật Bản / ISO 9001:2015" } },
    ],
  },
  "napkins": {
    slug: "napkins",
    sku: "UG-NPK-02",
    name: {
      en: "Napkins & Table Tissue",
      vi: "Khăn giấy ăn & Bếp",
    },
    summary: {
      en: "Folded napkins and table tissue for food service, commercial canteens and restaurant supply.",
      vi: "Khăn giấy ăn gấp chuyên dùng cho nhà hàng, khách sạn, bếp ăn công nghiệp và chuỗi dịch vụ F&B.",
    },
    description: {
      en: "Produced from soft, highly absorbent virgin pulp with precision embossing. Available in quarter-fold, dispenser-fold, and custom logo printing for corporate and hospitality clients.",
      vi: "Sản xuất từ bột giấy nguyên sinh mềm mại, thấm hút vượt trội với hoa văn dập nổi sắc nét. Cung cấp quy cách gấp 1/4, gấp rút và in logo thương hiệu theo yêu cầu doanh nghiệp.",
    },
    categories: [
      { slug: "napkins", name: { en: "Napkins", vi: "Khăn giấy ăn" } },
      { slug: "horeca", name: { en: "Horeca Supply", vi: "Dịch vụ F&B" } },
    ],
    images: [
      { src: "/images/products/napkins.webp", alt: { en: "Uni-Green 1000g Napkin Pack", vi: "Gói khăn giấy ăn Uni-Green 1000g" } },
      { src: "/images/products/napkins-500g.webp", alt: { en: "Uni-Green 500g Napkin Pack", vi: "Gói khăn giấy ăn Uni-Green 500g" } },
      { src: "/images/factory/packing-labelling.webp", alt: { en: "Packing and labelling line", vi: "Dây chuyền đóng gói dán nhãn" } },
    ],
    oem_available: true,
    specifications: [
      { key: "size", label: { en: "Sheet Dimensions", vi: "Kích thước tờ" }, value: { en: "240 x 240 / 330 x 330", vi: "240 x 240 / 330 x 330" }, unit: "mm" },
      { key: "ply", label: { en: "Ply Count", vi: "Số lớp" }, value: { en: "1 – 2 ply", vi: "1 – 2 lớp" } },
      { key: "fold", label: { en: "Folding Type", vi: "Quy cách gấp" }, value: { en: "1/4 Fold / Interfold / 1/8 Fold", vi: "Gấp 1/4 / Gấp rút / Gấp 1/8" } },
      { key: "emboss", label: { en: "Embossing", vi: "Dập nổi hoa văn" }, value: { en: "Border embossed / Full embossed", vi: "Dập viền / Dập nổi toàn phần" } },
      { key: "packaging", label: { en: "Pack Weight", vi: "Đóng gói" }, value: { en: "500g / 1,000g per bag (20 bags/carton)", vi: "500g / 1.000g mỗi gói (20 gói/thùng)" } },
      { key: "oem", label: { en: "OEM / Brand Print", vi: "Gia công in logo", }, value: { en: "Available (up to 2-color flexo)", vi: "Có (In flexo tối đa 2 màu)" } },
    ],
  },
  "toilet-paper": {
    slug: "toilet-paper",
    sku: "UG-TP-03",
    name: {
      en: "Toilet Paper & Holders",
      vi: "Giấy vệ sinh cuộn & Hộp đựng",
    },
    summary: {
      en: "Premium roll tissue supplied in 10-roll and 12-roll packs with matching facility dispensers.",
      vi: "Giấy vệ sinh cuộn cao cấp quy cách 10 cuộn và 12 cuộn kèm hộp đựng chuyên dụng.",
    },
    description: {
      en: "Multi-ply toilet tissue engineered for maximum softness, superior water dispersibility, and zero dust. Available in retail packs of 10 or 12 rolls, pink-core retail variants, and jumbo dispenser rolls.",
      vi: "Giấy vệ sinh nhiều lớp êm ái, tan nhanh trong nước chống tắc nghẽn và không bụi giấy. Đa dạng quy cách đóng lốc 10 cuộn, 12 cuộn, lõi hồng và cuộn lớn cho tòa nhà.",
    },
    categories: [
      { slug: "toilet-paper", name: { en: "Toilet Tissue", vi: "Giấy vệ sinh" } },
      { slug: "retail-pack", name: { en: "Retail & Commercial", vi: "Bán lẻ & Tòa nhà" } },
    ],
    images: [
      { src: "/images/products/toilet-paper.webp", alt: { en: "Uni-Green 10-roll Pack", vi: "Lốc 10 cuộn Uni-Green" } },
      { src: "/images/products/toilet-paper-12rolls.webp", alt: { en: "Uni-Green 12-roll Pack", vi: "Lốc 12 cuộn Uni-Green" } },
      { src: "/images/products/toilet-paper-pink-core.webp", alt: { en: "Pink Core Tissue", vi: "Giấy vệ sinh lõi hồng" } },
      { src: "/images/factory/quality-check.webp", alt: { en: "Quality inspection", vi: "Kiểm tra chất lượng" } },
    ],
    oem_available: true,
    specifications: [
      { key: "gsm", label: { en: "Basis Weight", vi: "Định lượng" }, value: { en: "15 – 17", vi: "15 – 17" }, unit: "g/m²" },
      { key: "ply", label: { en: "Ply Count", vi: "Số lớp" }, value: { en: "2 – 3 ply", vi: "2 – 3 lớp" } },
      { key: "roll_weight", label: { en: "Roll Weight", vi: "Trọng lượng cuộn" }, value: { en: "90g – 140g per roll", vi: "90g – 140g / cuộn" } },
      { key: "sheet_size", label: { en: "Perforation Size", vi: "Kích thước đoạn cắt" }, value: { en: "100 x 100", vi: "100 x 100" }, unit: "mm" },
      { key: "core_dia", label: { en: "Core Diameter", vi: "Đường kính lõi" }, value: { en: "40 – 45", vi: "40 – 45" }, unit: "mm" },
      { key: "packaging", label: { en: "Packaging Format", vi: "Quy cách đóng gói" }, value: { en: "10 rolls / 12 rolls polybag with carry handle", vi: "Bọc 10 cuộn / 12 cuộn có quai xách tiện lợi" } },
      { key: "solubility", label: { en: "Water Solubility", vi: "Độ tan trong nước" }, value: { en: "Fast dispersion (< 15 seconds)", vi: "Tan nhanh (< 15 giây), chống tắc cống" } },
    ],
  },
  "coreless-paper": {
    slug: "coreless-paper",
    sku: "UG-CL-04",
    name: {
      en: "Coreless Paper",
      vi: "Giấy không lõi",
    },
    summary: {
      en: "Wound without a cardboard core — more paper per roll, nothing to dispose of.",
      vi: "Quấn không lõi — nhiều giấy hơn trên mỗi cuộn, không rác thải lõi giấy.",
    },
    description: {
      en: "High-compression coreless technology eliminates cardboard waste and provides up to 25% more usable tissue per pack volume. Ideal for eco-conscious enterprises, hospitals, and high-traffic washrooms.",
      vi: "Công nghệ quấn nén chặt không lõi loại bỏ hoàn toàn rác thải lõi carton và tăng thêm 25% lượng giấy trên cùng thể tích đóng gói. Lựa chọn tối ưu cho doanh nghiệp xanh, bệnh viện và khu công nghiệp.",
    },
    categories: [
      { slug: "coreless", name: { en: "Coreless Paper", vi: "Giấy không lõi" } },
      { slug: "eco-friendly", name: { en: "Eco-friendly", vi: "Thân thiện môi trường" } },
    ],
    images: [
      { src: "/images/products/coreless.webp", alt: { en: "Uni-Green Coreless 10-roll Pack", vi: "Giấy vệ sinh không lõi 10 cuộn" } },
      { src: "/images/products/coreless-6rolls.webp", alt: { en: "Coreless 6-roll Pack", vi: "Lốc không lõi 6 cuộn" } },
      { src: "/images/products/coreless-recycle.webp", alt: { en: "Eco-recycled coreless pack", vi: "Giấy không lõi tái chế sinh thái" } },
    ],
    oem_available: true,
    specifications: [
      { key: "gsm", label: { en: "Basis Weight", vi: "Định lượng" }, value: { en: "15 – 16", vi: "15 – 16" }, unit: "g/m²" },
      { key: "ply", label: { en: "Ply Count", vi: "Số lớp" }, value: { en: "3 ply (high density)", vi: "3 lớp nén chắc" } },
      { key: "roll_weight", label: { en: "Roll Weight", vi: "Trọng lượng cuộn" }, value: { en: "100g – 150g per roll", vi: "100g – 150g / cuộn" } },
      { key: "roll_dia", label: { en: "Roll Diameter", vi: "Đường kính cuộn" }, value: { en: "105 – 115", vi: "105 – 115" }, unit: "mm" },
      { key: "packaging", label: { en: "Pack Units", vi: "Quy cách đóng gói" }, value: { en: "6 rolls / 10 rolls sealed pack", vi: "Lốc 6 cuộn / 10 cuộn màng co kín" } },
      { key: "core_waste", label: { en: "Core Waste", vi: "Rác thải lõi" }, value: { en: "0% (No paper core)", vi: "0% (Không dùng lõi giấy)" } },
    ],
  },
};

export function ProductDetailPage({
  locale,
  slug,
}: {
  readonly locale: Locale;
  readonly slug: string;
}) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.productDetail;
  const basketCopy = dictionary.basket;
  const [selected, setSelected] = useState(0);

  const query = useQuery({
    queryKey: ["public-product", locale, slug],
    queryFn: () =>
      apiRequest<PublicProductDetail>(
        `/api/v1/public/products/${encodeURIComponent(slug)}?locale=${locale}`,
      ),
    retry: 1,
  });

  const defaultProduct = STATIC_PRODUCTS["toilet-paper"]!;
  const staticFallback: StaticProduct = STATIC_PRODUCTS[slug] ?? defaultProduct;

  if (query.isPending && !STATIC_PRODUCTS[slug]) {
    return (
      <div className="shell py-16">
        <CatalogueSkeleton />
      </div>
    );
  }

  // Use API data if available, otherwise use static rich data
  const apiProduct = query.data;

  const productName = apiProduct?.name ?? staticFallback.name[locale];
  const productSku = apiProduct?.sku ?? staticFallback.sku;
  const productSummary = apiProduct?.summary ?? staticFallback.summary[locale];
  const productDescription = apiProduct?.description ?? staticFallback.description[locale];
  const isOem = apiProduct?.oem_available ?? staticFallback.oem_available;
  const categories = apiProduct?.categories ?? staticFallback.categories.map((c) => ({
    slug: c.slug,
    name: c.name[locale],
  }));

  const images = apiProduct?.media?.length
    ? apiProduct.media.map((m) => {
        const variant = m.variants.at(-1);
        return variant
          ? {
              src: variant.url,
              alt: m.alt_text,
              runtime: true as const,
              width: variant.width,
              height: variant.height,
            }
          : {
              src: "/images/products/toilet-paper.webp",
              alt: m.alt_text,
              runtime: false as const,
            };
      })
    : staticFallback.images.map((img) => ({
        src: img.src,
        alt: img.alt[locale],
        runtime: false as const,
      }));

  const specifications = apiProduct?.specifications?.length
    ? apiProduct.specifications.map((s) => ({
        key: s.key,
        label: s.label,
        value: s.value,
        unit: s.unit,
      }))
    : staticFallback.specifications.map((s) => ({
        key: s.key,
        label: s.label[locale],
        value: s.value[locale],
        unit: s.unit,
      }));

  const currentImage =
    images[selected] ??
    images[0] ?? {
      src: "/images/products/toilet-paper.webp",
      alt: productName,
      runtime: false as const,
    };

  // Related product families
  const relatedKeys = Object.keys(STATIC_PRODUCTS).filter((k) => k !== slug).slice(0, 3);

  return (
    <article className="min-h-screen bg-paper pb-24 pt-8 lg:pb-32 lg:pt-12">
      <div className="shell">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[12px] text-ink-faint">
          <Link href={`/${locale}`} className="transition-colors hover:text-ink">
            {copy.home}
          </Link>
          <span>/</span>
          <Link href={cataloguePath(locale)} className="transition-colors hover:text-ink">
            {copy.products}
          </Link>
          <span>/</span>
          <span className="text-brand-dark font-medium truncate max-w-[200px] sm:max-w-none">
            {productName}
          </span>
        </nav>

        {/* Main Product Grid */}
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          {/* Gallery View */}
          <section aria-label={copy.gallery} className="flex flex-col">
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-paper-raised p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:aspect-square">
              {currentImage.runtime ? (
                // Runtime media host; see docs/adr/0004 — it must not be routed
                // through next/image, whose remotePatterns cannot enumerate an
                // environment-dependent host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage.src}
                  alt={currentImage.alt}
                  width={currentImage.width}
                  height={currentImage.height}
                  // Above the fold and the page's LCP element, so it must not be
                  // lazy — that would defer the largest paint by a round trip.
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_16px_32px_rgba(0,0,0,0.08)]"
                />
              ) : (
                <Image
                  src={currentImage.src}
                  alt={currentImage.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-6 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_16px_32px_rgba(0,0,0,0.08)]"
                />
              )}
              <span className="absolute left-4 top-4 rounded-full bg-paper-sunk px-3 py-1 font-mono text-[11px] tracking-wider text-ink-muted border border-line">
                {productSku}
              </span>
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <button
                    key={`${img.src}-${index}`}
                    type="button"
                    onClick={() => setSelected(index)}
                    aria-label={img.alt}
                    aria-pressed={selected === index}
                    className={`relative aspect-[4/3] overflow-hidden rounded-control border transition-all ${
                      selected === index
                        ? "border-brand-green ring-2 ring-brand-green/20 bg-paper-raised"
                        : "border-line bg-paper-sunk hover:border-line-strong"
                    }`}
                  >
                    {img.runtime ? (
                      // Runtime media host; see docs/adr/0004.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.src}
                        alt={img.alt}
                        width={img.width}
                        height={img.height}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="120px"
                        className="object-contain p-2"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] tracking-[0.16em] text-brand-green font-semibold">
                {productSku}
              </span>
              {isOem ? (
                <span className="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-[11px] font-medium text-brand-dark">
                  {copy.oemTag}
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-[clamp(32px,3.5vw,48px)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
              {productName}
            </h1>

            <p className="mt-4 text-[17px] leading-[1.6] text-ink-muted">
              {productSummary}
            </p>

            <div className="mt-6 border-t border-line pt-6">
              <p className="text-[15px] leading-[1.7] text-ink-muted whitespace-pre-line">
                {productDescription}
              </p>
            </div>

            {/* Categories */}
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat.slug}
                  className="rounded-control border border-line bg-paper-sunk px-3 py-1 font-mono text-[12px] text-ink-muted"
                >
                  {cat.name}
                </span>
              ))}
            </div>

            {/* Quality Standard Note */}
            <div className="mt-8 rounded-control border border-line bg-paper-raised p-4">
              <p className="text-[13px] leading-relaxed text-ink-muted flex items-start gap-2.5">
                <span className="text-brand-green font-semibold text-[16px]">✓</span>
                <span>{copy.standardNote}</span>
              </p>
            </div>

            {/* Action CTAs */}
            {apiProduct ? (
              <div className="mt-8">
                <AddToBasketControl product={apiProduct} copy={basketCopy} />
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={`/${locale}/inquiry`}
                className="inline-flex items-center justify-center rounded-[2px] bg-brand-green px-7 py-4 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark shadow-sm"
              >
                {copy.inquiry} &rarr;
              </a>
              <Link
                href={cataloguePath(locale)}
                className="inline-flex items-center justify-center rounded-[2px] border border-line-strong bg-paper-raised px-6 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-paper-sunk"
              >
                {copy.back}
              </Link>
            </div>
          </div>
        </div>

        {/* Specifications Table */}
        <section className="mt-20 border-t border-line pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
                TECHNICAL DATA SHEET
              </p>
              <h2 className="mt-2 text-[clamp(24px,2.5vw,36px)] font-semibold tracking-[-0.02em] text-ink">
                {copy.specifications}
              </h2>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-card border border-line bg-paper-raised shadow-xs">
            <dl className="divide-y divide-line">
              {specifications.map((spec) => (
                <div
                  key={spec.key}
                  className="grid grid-cols-1 gap-2 p-5 transition-colors hover:bg-paper-sunk sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-6 sm:px-8"
                >
                  <dt className="font-medium text-[15px] text-ink">{spec.label}</dt>
                  <dd className="font-mono text-[14px] text-ink-muted">
                    <span className="text-ink font-medium">{spec.value}</span>
                    {spec.unit ? <span className="ml-1 text-ink-faint">{spec.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Related Product Families */}
        <section className="mt-20 border-t border-line pt-12">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
            {copy.relatedTitle}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {relatedKeys.map((relKey) => {
              const rel = STATIC_PRODUCTS[relKey];
              if (!rel) return null;
              const firstImg = rel.images[0]?.src ?? "/images/products/toilet-paper.webp";
              return (
                <Link
                  key={rel.slug}
                  href={productPath(locale, rel.slug)}
                  className="group block overflow-hidden rounded-card border border-line bg-paper-raised transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-sunk">
                    <Image
                      src={firstImg}
                      alt={rel.name[locale]}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="font-mono text-[10px] tracking-wider text-ink-faint">
                      {rel.sku}
                    </p>
                    <h3 className="mt-1 text-[18px] font-medium text-ink transition-colors group-hover:text-brand-green">
                      {rel.name[locale]}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                      {rel.summary[locale]}
                    </p>
                    <span className="mt-4 inline-flex items-center font-mono text-[12px] font-medium text-brand-green">
                      {copy.viewDetail} &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Schema.org Product Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: productName,
            description: productSummary,
            sku: productSku,
            image: currentImage.src,
            brand: {
              "@type": "Brand",
              name: "Uni-Green",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
