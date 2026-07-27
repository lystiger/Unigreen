import { CataloguePage } from "@/components/product/CataloguePage";
import { isLocale } from "@/lib/i18n";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export default async function ProductsPage({
  params,
}: {
  readonly params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === "vi") redirect("/vi/san-pham");
  return (
    <Suspense
      fallback={
        <p className="shell py-16" aria-busy="true">
          Loading catalogue…
        </p>
      }
    >
      <CataloguePage locale={locale} />
    </Suspense>
  );
}
