import { ProductPreview } from "@/components/product/ProductPreview";
import { Hero } from "@/components/sections/Hero";
import { InquiryBand } from "@/components/sections/InquiryBand";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getDictionary, isLocale } from "@/lib/i18n";
import { cataloguePath } from "@/lib/routes";
import { notFound } from "next/navigation";

interface HomePageProps {
  readonly params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const dictionary = getDictionary(locale);
  return (
    <>
      <Hero locale={locale} copy={dictionary.hero} />
      <section className="py-16 lg:py-24">
        <div className="shell">
          <SectionHeader
            eyebrow={dictionary.products.eyebrow}
            title={dictionary.products.title}
            linkHref={cataloguePath(locale)}
            linkLabel={dictionary.products.viewAll}
          />
          <div className="mt-12">
            <ProductPreview locale={locale} copy={dictionary.products} />
          </div>
        </div>
      </section>
      <InquiryBand
        locale={locale}
        copy={dictionary.inquiry}
        hotline={dictionary.footer.hotline}
      />
    </>
  );
}
