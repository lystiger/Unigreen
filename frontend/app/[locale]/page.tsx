import { FactoryGallery } from "@/components/sections/FactoryGallery";
import { Hero } from "@/components/sections/Hero";
import { Manufacturing } from "@/components/sections/Manufacturing";
import { OemBand } from "@/components/sections/OemBand";
import { PaperJourney } from "@/components/sections/PaperJourney";
import { ProductFamilies } from "@/components/sections/ProductFamilies";
import { QuotationForm } from "@/components/sections/QuotationForm";
import { StandardsBar } from "@/components/sections/StandardsBar";
import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

interface HomePageProps {
  readonly params: Promise<{ locale: string }>;
}

/**
 * Uni-Green landing, imported from `Uni-Green Landing.dc.html`. The sections
 * carry bilingual-inline copy (English lead, Vietnamese subtitle) exactly as the
 * design specifies, so they render identically for both locales; the locale
 * segment still drives the header, footer and language switch.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <Hero />
      <StandardsBar />
      <PaperJourney />
      <ProductFamilies locale={locale} />
      <Manufacturing />
      <FactoryGallery />
      <OemBand />
      <QuotationForm />
    </>
  );
}
