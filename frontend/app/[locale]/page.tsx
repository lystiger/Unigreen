import { ProductGrid } from "@/components/product/ProductGrid";
import { Certifications } from "@/components/sections/Certifications";
import { Hero } from "@/components/sections/Hero";
import { InquiryBand } from "@/components/sections/InquiryBand";
import { OemProcess } from "@/components/sections/OemProcess";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SpecStrip, type SpecStripItem } from "@/components/ui/SpecStrip";
import { PRODUCTS, getFeaturedProducts, type Locale } from "@/lib/catalogue";
import { getDictionary, isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

interface HomePageProps {
  readonly params: Promise<{ locale: string }>;
}

function buildSpecStripItems(
  locale: Locale,
  copy: ReturnType<typeof getDictionary>["specStrip"],
): readonly SpecStripItem[] {
  const basisWeights = PRODUCTS.map((product) => product.spec.basisWeight);
  const plies = PRODUCTS.map((product) => product.spec.plies);
  const lengths = PRODUCTS.map((product) => product.spec.metresPerRoll ?? 0);
  const moqs = PRODUCTS.map((product) => product.packing.minOrderCartons);

  const range = (values: readonly number[], unit: string): string => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
  };

  return [
    { id: "basis", label: copy.basisWeight, value: range(basisWeights, "g/m²") },
    {
      id: "plies",
      label: copy.plies,
      value: range(plies, locale === "vi" ? "lớp" : "ply"),
    },
    { id: "length", label: copy.rollLength, value: range(lengths, "m") },
    {
      id: "moq",
      label: copy.moq,
      value: `${Math.min(...moqs).toLocaleString(locale)} ${locale === "vi" ? "thùng" : "ctn"}`,
    },
    { id: "standard", label: copy.standard, value: "TCCS 620:2020" },
  ];
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const dictionary = getDictionary(locale);
  const featured = getFeaturedProducts(4);
  const leadProduct = featured[0] ?? null;

  return (
    <>
      <Hero locale={locale} copy={dictionary.hero} leadProduct={leadProduct} />

      <SpecStrip
        label={dictionary.specStrip.label}
        items={buildSpecStripItems(locale, dictionary.specStrip)}
      />

      <section className="py-16 lg:py-24">
        <div className="shell">
          <SectionHeader
            eyebrow={dictionary.products.eyebrow}
            title={dictionary.products.title}
            linkHref={`/${locale}/products`}
            linkLabel={dictionary.products.viewAll}
          />
          <div className="mt-12">
            <ProductGrid
              products={featured}
              locale={locale}
              copy={dictionary.products}
            />
          </div>
        </div>
      </section>

      <OemProcess locale={locale} copy={dictionary.oem} />

      <Certifications copy={dictionary.capability} />

      <InquiryBand
        locale={locale}
        copy={dictionary.inquiry}
        hotline={dictionary.footer.hotline}
      />
    </>
  );
}
